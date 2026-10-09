pub mod chain_head;
pub mod coinbase;
pub mod config;
pub mod messages;
pub mod redis_publisher;

pub fn install_rustls_crypto_provider() {
    let _ = rustls::crypto::ring::default_provider().install_default();
}

#[cfg(test)]
mod tests {
    #[test]
    fn rustls_ring_provider_is_available() {
        let _ = rustls::crypto::ring::default_provider();
    }
}
