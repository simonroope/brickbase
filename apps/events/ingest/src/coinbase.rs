use std::sync::Arc;
use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use tokio::sync::Mutex;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

use crate::messages::{LiveFeedMessage, LIVE_FEED_SCHEMA_VERSION, TICKER_ETH_USD};
use crate::redis_publisher::RedisPublisher;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CoinbaseTicker {
    pub symbol: String,
    pub price: String,
    pub change_24h: Option<String>,
    pub volume_24h: Option<String>,
}

#[derive(Deserialize)]
struct CoinbaseFrame {
    channel: Option<String>,
    events: Option<Vec<CoinbaseEvent>>,
}

#[derive(Deserialize)]
struct CoinbaseEvent {
    tickers: Option<Vec<CoinbaseTickerRow>>,
}

#[derive(Deserialize)]
struct CoinbaseTickerRow {
    product_id: Option<String>,
    price: Option<String>,
    price_percent_chg_24h: Option<String>,
    volume_24h: Option<String>,
}

pub fn parse_coinbase_ticker(raw: &str, product_id: &str) -> Option<CoinbaseTicker> {
    let data: CoinbaseFrame = serde_json::from_str(raw).ok()?;
    if data.channel.as_deref() != Some("ticker") {
        return None;
    }
    for event in data.events? {
        for ticker in event.tickers.unwrap_or_default() {
            if ticker.product_id.as_deref() == Some(product_id) {
                if let Some(price) = ticker.price.filter(|value| !value.is_empty()) {
                    return Some(CoinbaseTicker {
                        symbol: product_id.to_string(),
                        price,
                        change_24h: ticker.price_percent_chg_24h,
                        volume_24h: ticker.volume_24h,
                    });
                }
            }
        }
    }
    None
}

pub async fn run_coinbase_feed(
    ws_url: String,
    product_id: String,
    publish_interval: Duration,
    publisher: RedisPublisher,
) {
    let latest: Arc<Mutex<Option<CoinbaseTicker>>> = Arc::new(Mutex::new(None));
    let mut backoff = Duration::from_secs(1);

    loop {
        match connect_async(&ws_url).await {
            Ok((ws, _)) => {
                tracing::info!("[ingest][coinbase] connected");
                backoff = Duration::from_secs(1);
                let (mut write, mut read) = ws.split();
                let subscribe = serde_json::json!({
                    "type": "subscribe",
                    "product_ids": [&product_id],
                    "channel": "ticker",
                });
                if write
                    .send(Message::Text(subscribe.to_string().into()))
                    .await
                    .is_err()
                {
                    tracing::error!("[ingest][coinbase] subscribe failed");
                    continue;
                }

                let latest_flush = Arc::clone(&latest);
                let publisher_flush = publisher.clone();
                let mut flush = tokio::time::interval(publish_interval);
                loop {
                    tokio::select! {
                        _ = flush.tick() => {
                            let snapshot = latest_flush.lock().await.clone();
                            if let Some(ticker) = snapshot {
                                let msg = LiveFeedMessage::Ticker {
                                    v: LIVE_FEED_SCHEMA_VERSION,
                                    ts: now_ms(),
                                    source: "coinbase",
                                    symbol: ticker.symbol,
                                    price: ticker.price,
                                    change_24h: ticker.change_24h,
                                    volume_24h: ticker.volume_24h,
                                };
                                if let Err(error) = publisher_flush.publish(TICKER_ETH_USD, &msg).await {
                                    tracing::error!("[ingest][coinbase] publish failed: {error}");
                                }
                            }
                        }
                        incoming = read.next() => {
                            match incoming {
                                Some(Ok(Message::Text(text))) => {
                                    if let Some(parsed) = parse_coinbase_ticker(&text, &product_id) {
                                        *latest.lock().await = Some(parsed);
                                    }
                                }
                                Some(Ok(Message::Ping(payload))) => {
                                    let _ = write.send(Message::Pong(payload)).await;
                                }
                                Some(Ok(Message::Close(_))) | None => {
                                    tracing::warn!("[ingest][coinbase] disconnected");
                                    break;
                                }
                                Some(Err(error)) => {
                                    tracing::error!("[ingest][coinbase] error: {error}");
                                    break;
                                }
                                _ => {}
                            }
                        }
                    }
                }
            }
            Err(error) => {
                tracing::error!("[ingest][coinbase] error: {error}");
            }
        }
        tokio::time::sleep(backoff).await;
        backoff = (backoff * 2).min(Duration::from_secs(30));
    }
}

fn now_ms() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_price_from_ticker_channel_event() {
        let raw = serde_json::json!({
            "channel": "ticker",
            "events": [{
                "type": "update",
                "tickers": [{
                    "product_id": "ETH-USD",
                    "price": "3500.12",
                    "price_percent_chg_24h": "1.5",
                    "volume_24h": "1000"
                }]
            }]
        })
        .to_string();
        let result = parse_coinbase_ticker(&raw, "ETH-USD").expect("ticker");
        assert_eq!(result.price, "3500.12");
        assert_eq!(result.change_24h.as_deref(), Some("1.5"));
    }
}
