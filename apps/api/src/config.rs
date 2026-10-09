const DEFAULT_CHAIN_ID: u64 = 11155111;
const DEFAULT_API_PORT: u16 = 3200;

pub struct Config {
    pub port: u16,
    pub chain_id: u64,
    pub rpc_url: String,
    pub infura_project_id: String,
    pub asset_vault_address: String,
    pub asset_shares_address: String,
    pub oracle_router_address: String,
    pub user_allowlist_address: String,
    pub usdc_address: String,
    pub database_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: parse_u16("API_PORT", DEFAULT_API_PORT),
            chain_id: parse_u64("CHAIN_ID", DEFAULT_CHAIN_ID),
            rpc_url: env_or_empty("RPC_URL"),
            infura_project_id: env_or_empty("INFURA_PROJECT_ID"),
            asset_vault_address: env_or_empty("ASSET_VAULT_ADDRESS"),
            asset_shares_address: env_or_empty("ASSET_SHARES_ADDRESS"),
            oracle_router_address: env_or_empty("ORACLE_ROUTER_ADDRESS"),
            user_allowlist_address: env_or_empty("USER_ALLOWLIST_ADDRESS"),
            usdc_address: env_or_empty("USDC_ADDRESS"),
            database_url: env_or_empty("DATABASE_URL"),
        }
    }
}

fn env_or_empty(key: &str) -> String {
    std::env::var(key).unwrap_or_default()
}

fn parse_u16(key: &str, default: u16) -> u16 {
    std::env::var(key)
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(default)
}

fn parse_u64(key: &str, default: u64) -> u64 {
    std::env::var(key)
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(default)
}
