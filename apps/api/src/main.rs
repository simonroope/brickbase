use brickbase_api::config::Config;
use brickbase_api::http::router;
use brickbase_api::state::AppState;

fn load_dotenv() {
    let root_env = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../.env");
    let _ = dotenvy::from_path(root_env);
    let _ = dotenvy::dotenv();
}

#[tokio::main]
async fn main() {
    load_dotenv();
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let config = Config::from_env();
    if config.database_url.is_empty() {
        panic!("DATABASE_URL is required");
    }

    let pool = brickbase_api::db::connect(&config.database_url)
        .await
        .unwrap_or_else(|error| panic!("postgres: {error}"));
    brickbase_api::db::migrate(&pool)
        .await
        .unwrap_or_else(|error| panic!("migrate: {error}"));
    brickbase_api::db::seed_mock_assets(&pool)
        .await
        .unwrap_or_else(|error| panic!("seed: {error}"));

    let addr = format!("0.0.0.0:{}", config.port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|error| panic!("failed to bind {addr}: {error}"));

    tracing::info!(%addr, "api listening");
    axum::serve(listener, router(AppState { pool }))
        .await
        .expect("api server");
}
