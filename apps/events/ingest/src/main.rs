use std::time::Duration;

use brickbase_ingest::chain_head::run_chain_head_feed;
use brickbase_ingest::coinbase::run_coinbase_feed;
use brickbase_ingest::config::{chain_head_log_label, get_chain_head_ws_url, IngestConfig};
use brickbase_ingest::redis_publisher::RedisPublisher;

#[tokio::main]
async fn main() {
    brickbase_ingest::install_rustls_crypto_provider();
    tracing_subscriber::fmt()
        .with_writer(std::io::stderr)
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let config = IngestConfig::from_env();
    let publisher = RedisPublisher::connect(&config.redis_url, config.last_value_ttl_seconds)
        .await
        .unwrap_or_else(|error| panic!("redis: {error}"));

    let coinbase = tokio::spawn(run_coinbase_feed(
        config.coinbase_ws_url.clone(),
        config.coinbase_product_id.clone(),
        Duration::from_millis(config.ticker_publish_interval_ms),
        publisher.clone(),
    ));

    let chain_head = get_chain_head_ws_url(
        &config.infura_project_id,
        &config.rpc_url,
        &config.infura_ws_network,
    )
    .map(|ws_url| {
        tokio::spawn(run_chain_head_feed(
            ws_url,
            config.chain_id,
            publisher.clone(),
        ))
    });

    if chain_head.is_none() {
        tracing::warn!(
            "[ingest][{}] skipped — set RPC_URL (Hardhat locally, or Infura + INFURA_PROJECT_ID)",
            chain_head_log_label(config.chain_id)
        );
    }

    tracing::info!("[ingest] running (Coinbase ticker + chain newHeads when configured)");

    shutdown_signal().await;
    coinbase.abort();
    if let Some(handle) = chain_head {
        handle.abort();
    }
}

async fn shutdown_signal() {
    let ctrl_c = tokio::signal::ctrl_c();
    #[cfg(unix)]
    {
        let mut terminate =
            tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                .expect("SIGTERM handler");
        tokio::select! {
            _ = ctrl_c => {}
            _ = terminate.recv() => {}
        }
    }
    #[cfg(not(unix))]
    {
        let _ = ctrl_c.await;
    }
}
