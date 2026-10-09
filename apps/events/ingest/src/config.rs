use std::path::Path;

use url::Url;

pub struct IngestConfig {
    pub redis_url: String,
    pub infura_project_id: String,
    pub rpc_url: String,
    pub infura_ws_network: String,
    pub chain_id: u64,
    pub coinbase_ws_url: String,
    pub coinbase_product_id: String,
    pub ticker_publish_interval_ms: u64,
    pub last_value_ttl_seconds: u64,
}

impl IngestConfig {
    pub fn from_env() -> Self {
        load_dotenv();
        let infura_project_id = env_or_empty("INFURA_PROJECT_ID");
        let rpc_url = append_project_id(&env_or_empty("RPC_URL"), &infura_project_id);
        Self {
            redis_url: env_or("REDIS_URL", "redis://127.0.0.1:6379"),
            infura_project_id,
            rpc_url,
            infura_ws_network: env_or_empty("INFURA_WS_NETWORK"),
            chain_id: parse_u64("CHAIN_ID", 11155111),
            coinbase_ws_url: env_or("COINBASE_WS_URL", "wss://advanced-trade-ws.coinbase.com"),
            coinbase_product_id: env_or("COINBASE_PRODUCT_ID", "ETH-USD"),
            ticker_publish_interval_ms: parse_u64("TICKER_PUBLISH_INTERVAL_MS", 250),
            last_value_ttl_seconds: parse_u64("LIVE_LAST_VALUE_TTL_SECONDS", 86400),
        }
    }
}

fn load_dotenv() {
    let root_env = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../../.env");
    let _ = dotenvy::from_path(root_env);
    let _ = dotenvy::dotenv();
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key)
        .ok()
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| default.to_string())
}

fn env_or_empty(key: &str) -> String {
    std::env::var(key).unwrap_or_default()
}

fn parse_u64(key: &str, default: u64) -> u64 {
    std::env::var(key)
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(default)
}

pub fn append_project_id(base_url: &str, project_id: &str) -> String {
    if project_id.is_empty()
        || !base_url.ends_with('/')
        || base_url.contains("localhost")
        || base_url.contains("127.0.0.1")
    {
        return base_url.to_string();
    }
    format!("{base_url}{project_id}")
}

pub fn chain_head_log_label(chain_id: u64) -> String {
    match chain_id {
        1 => "mainnet".to_string(),
        11155111 => "sepolia".to_string(),
        8453 => "base".to_string(),
        84532 => "base-sepolia".to_string(),
        31337 => "hardhat".to_string(),
        other => format!("chain-{other}"),
    }
}

pub fn get_chain_head_ws_url(project_id: &str, rpc_url: &str, network: &str) -> Option<String> {
    if !rpc_url.is_empty() {
        if let Ok(mut parsed) = Url::parse(rpc_url) {
            let hostname = parsed.host_str().unwrap_or("");
            if is_loopback_hostname(hostname) {
                let next = if parsed.scheme() == "https" {
                    "wss"
                } else {
                    "ws"
                };
                let _ = parsed.set_scheme(next);
                return Some(parsed.to_string().trim_end_matches('/').to_string());
            }
            if hostname.ends_with(".infura.io") {
                if project_id.is_empty() {
                    return None;
                }
                return Some(format!("wss://{hostname}/ws/v3/{project_id}"));
            }
        } else {
            return None;
        }
    }

    infura_ws_host(network)
        .filter(|_| !project_id.is_empty())
        .map(|host| format!("wss://{host}/ws/v3/{project_id}"))
}

fn is_loopback_hostname(hostname: &str) -> bool {
    hostname == "localhost" || hostname == "127.0.0.1"
}

fn infura_ws_host(network: &str) -> Option<&'static str> {
    match network {
        "mainnet" => Some("mainnet.infura.io"),
        "sepolia" => Some("sepolia.infura.io"),
        "base" | "base-mainnet" => Some("base-mainnet.infura.io"),
        "base-sepolia" => Some("base-sepolia.infura.io"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn derives_wss_from_an_infura_http_rpc_url() {
        assert_eq!(
            get_chain_head_ws_url("abc123", "https://sepolia.infura.io/v3/", ""),
            Some("wss://sepolia.infura.io/ws/v3/abc123".to_string())
        );
    }

    #[test]
    fn uses_hardhat_websocket_for_loopback_rpc_without_project_id() {
        assert_eq!(
            get_chain_head_ws_url("", "http://127.0.0.1:8545", ""),
            Some("ws://127.0.0.1:8545".to_string())
        );
        assert_eq!(
            get_chain_head_ws_url("", "http://localhost:8545", ""),
            Some("ws://localhost:8545".to_string())
        );
    }

    #[test]
    fn does_not_send_loopback_rpc_to_infura_when_network_is_set() {
        assert_eq!(
            get_chain_head_ws_url("abc123", "http://127.0.0.1:8545", "sepolia"),
            Some("ws://127.0.0.1:8545".to_string())
        );
    }

    #[test]
    fn uses_infura_ws_network_when_rpc_is_remote_non_infura() {
        assert_eq!(
            get_chain_head_ws_url("abc123", "https://rpc.sepolia.org", "sepolia"),
            Some("wss://sepolia.infura.io/ws/v3/abc123".to_string())
        );
    }

    #[test]
    fn returns_none_for_infura_http_without_project_id() {
        assert_eq!(
            get_chain_head_ws_url("", "https://sepolia.infura.io/v3/", ""),
            None
        );
    }

    #[test]
    fn names_the_connected_chain() {
        assert_eq!(chain_head_log_label(31337), "hardhat");
        assert_eq!(chain_head_log_label(11155111), "sepolia");
        assert_eq!(chain_head_log_label(1), "mainnet");
        assert_eq!(chain_head_log_label(8453), "base");
        assert_eq!(chain_head_log_label(84532), "base-sepolia");
        assert_eq!(chain_head_log_label(999), "chain-999");
    }
}
