use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;

pub async fn connect(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
}

pub async fn migrate(pool: &PgPool) -> Result<(), sqlx::migrate::MigrateError> {
    sqlx::migrate!("./migrations").run(pool).await
}

pub async fn seed_mock_assets(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO assets (
            asset_id, status, capital_value, income_value, metadata_uri,
            total_supply, available_supply, share_price, trading_enabled
        ) VALUES
            (1, 0, '1000000', '50000', 'ipfs://asset-1', '1000', '800', '100', TRUE),
            (2, 0, '2500000', '120000', 'ipfs://asset-2', '2000', '1500', '250', FALSE)
        ON CONFLICT (asset_id) DO NOTHING",
    )
    .execute(pool)
    .await?;
    Ok(())
}
