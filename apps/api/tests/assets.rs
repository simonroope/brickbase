use axum::body::Body;
use axum::http::{Request, StatusCode};
use brickbase_api::http::router;
use brickbase_api::state::AppState;
use http_body_util::BodyExt;
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

const DATABASE_URL: &str = "postgres://brickbase:brickbase@127.0.0.1:5432/brickbase";

#[tokio::test]
async fn get_assets_returns_mock_rows_from_postgres() {
    let url = std::env::var("DATABASE_URL").unwrap_or_else(|_| DATABASE_URL.to_string());
    let pool = PgPoolOptions::new().connect(&url).await.expect("postgres");
    brickbase_api::db::migrate(&pool).await.expect("migrate");
    sqlx::query("TRUNCATE assets")
        .execute(&pool)
        .await
        .expect("truncate");
    brickbase_api::db::seed_mock_assets(&pool)
        .await
        .expect("seed");

    let response = router(AppState { pool })
        .oneshot(
            Request::builder()
                .uri("/assets")
                .body(Body::empty())
                .expect("assets request"),
        )
        .await
        .expect("assets response");

    assert_eq!(response.status(), StatusCode::OK);

    let body = response
        .into_body()
        .collect()
        .await
        .expect("assets body")
        .to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).expect("assets json");
    assert_eq!(
        json,
        serde_json::json!([
            {
                "assetId": 1,
                "status": 0,
                "capitalValue": "1000000",
                "incomeValue": "50000",
                "metadataUri": "ipfs://asset-1",
                "totalSupply": "1000",
                "availableSupply": "800",
                "sharePrice": "100",
                "tradingEnabled": true
            },
            {
                "assetId": 2,
                "status": 0,
                "capitalValue": "2500000",
                "incomeValue": "120000",
                "metadataUri": "ipfs://asset-2",
                "totalSupply": "2000",
                "availableSupply": "1500",
                "sharePrice": "250",
                "tradingEnabled": false
            }
        ])
    );
}
