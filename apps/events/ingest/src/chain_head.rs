use std::time::Duration;

use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;

use crate::config::chain_head_log_label;
use crate::messages::{LiveFeedMessage, CHAIN_HEAD, LIVE_FEED_SCHEMA_VERSION};
use crate::redis_publisher::RedisPublisher;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct NewHead {
    pub chain_id: u64,
    pub block_number: String,
    pub block_hash: String,
    pub timestamp: u64,
}

#[derive(Deserialize)]
struct SubscriptionFrame {
    method: Option<String>,
    params: Option<SubscriptionParams>,
}

#[derive(Deserialize)]
struct SubscriptionParams {
    result: Option<HeadFields>,
}

#[derive(Deserialize)]
struct HeadFields {
    number: Option<String>,
    hash: Option<String>,
    timestamp: Option<String>,
}

pub fn parse_new_head(raw: &str, chain_id: u64) -> Option<NewHead> {
    let data: SubscriptionFrame = serde_json::from_str(raw).ok()?;
    if data.method.as_deref() != Some("eth_subscription") {
        return None;
    }
    let head = data.params?.result?;
    let number = head.number.filter(|value| !value.is_empty())?;
    let hash = head.hash.filter(|value| !value.is_empty())?;
    let timestamp = head.timestamp.filter(|value| !value.is_empty())?;
    Some(NewHead {
        chain_id,
        block_number: parse_hex_u64(&number)?.to_string(),
        block_hash: hash,
        timestamp: parse_hex_u64(&timestamp)?,
    })
}

fn parse_hex_u64(value: &str) -> Option<u64> {
    let trimmed = value
        .strip_prefix("0x")
        .or_else(|| value.strip_prefix("0X"))
        .unwrap_or(value);
    u64::from_str_radix(trimmed, 16).ok()
}

pub async fn run_chain_head_feed(ws_url: String, chain_id: u64, publisher: RedisPublisher) {
    let log_tag = format!("[ingest][{}]", chain_head_log_label(chain_id));
    let mut backoff = Duration::from_secs(1);
    let mut request_id: u64 = 1;

    loop {
        match connect_async(&ws_url).await {
            Ok((ws, _)) => {
                tracing::info!("{log_tag} connected");
                backoff = Duration::from_secs(1);
                let (mut write, mut read) = ws.split();
                let subscribe = serde_json::json!({
                    "jsonrpc": "2.0",
                    "id": request_id,
                    "method": "eth_subscribe",
                    "params": ["newHeads"],
                });
                request_id += 1;
                if write
                    .send(Message::Text(subscribe.to_string().into()))
                    .await
                    .is_err()
                {
                    tracing::error!("{log_tag} subscribe failed");
                    continue;
                }

                while let Some(incoming) = read.next().await {
                    match incoming {
                        Ok(Message::Text(text)) => {
                            if let Some(head) = parse_new_head(&text, chain_id) {
                                let msg = LiveFeedMessage::ChainHead {
                                    v: LIVE_FEED_SCHEMA_VERSION,
                                    ts: now_ms(),
                                    source: "infura",
                                    chain_id: head.chain_id,
                                    block_number: head.block_number,
                                    block_hash: head.block_hash,
                                    timestamp: head.timestamp,
                                };
                                if let Err(error) = publisher.publish(CHAIN_HEAD, &msg).await {
                                    tracing::error!("{log_tag} publish failed: {error}");
                                }
                            }
                        }
                        Ok(Message::Ping(payload)) => {
                            let _ = write.send(Message::Pong(payload)).await;
                        }
                        Ok(Message::Close(_)) => {
                            tracing::warn!("{log_tag} disconnected");
                            break;
                        }
                        Err(error) => {
                            tracing::error!("{log_tag} error: {error}");
                            break;
                        }
                        _ => {}
                    }
                }
            }
            Err(error) => {
                tracing::error!("{log_tag} error: {error}");
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
    fn parses_new_heads_subscription_notification() {
        let raw = serde_json::json!({
            "jsonrpc": "2.0",
            "method": "eth_subscription",
            "params": {
                "subscription": "0x1",
                "result": {
                    "number": "0x10",
                    "hash": "0xabc",
                    "timestamp": "0x5f5e100"
                }
            }
        })
        .to_string();
        let result = parse_new_head(&raw, 11155111).expect("head");
        assert_eq!(result.block_number, "16");
        assert_eq!(result.block_hash, "0xabc");
        assert_eq!(result.chain_id, 11155111);
        assert_eq!(result.timestamp, 0x5f5e100);
    }
}
