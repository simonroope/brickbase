use serde::Serialize;

pub const LIVE_FEED_SCHEMA_VERSION: u32 = 1;

pub const TICKER_ETH_USD: &str = "brickbase:live:ticker:eth-usd";
pub const CHAIN_HEAD: &str = "brickbase:live:chain:head";

const LAST_VALUE_PREFIX: &str = "brickbase:live:last:";

pub fn last_value_key(channel: &str) -> String {
    let suffix = channel.replacen("brickbase:live:", "", 1);
    format!("{LAST_VALUE_PREFIX}{suffix}")
}

#[derive(Serialize)]
#[serde(tag = "type")]
pub enum LiveFeedMessage {
    #[serde(rename = "ticker")]
    Ticker {
        v: u32,
        ts: u64,
        source: &'static str,
        symbol: String,
        price: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        #[serde(rename = "change24h")]
        change_24h: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        #[serde(rename = "volume24h")]
        volume_24h: Option<String>,
    },
    #[serde(rename = "chain_head")]
    ChainHead {
        v: u32,
        ts: u64,
        source: &'static str,
        #[serde(rename = "chainId")]
        chain_id: u64,
        #[serde(rename = "blockNumber")]
        block_number: String,
        #[serde(rename = "blockHash")]
        block_hash: String,
        timestamp: u64,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn last_value_key_strips_live_prefix() {
        assert_eq!(
            last_value_key(TICKER_ETH_USD),
            "brickbase:live:last:ticker:eth-usd"
        );
        assert_eq!(last_value_key(CHAIN_HEAD), "brickbase:live:last:chain:head");
    }
}
