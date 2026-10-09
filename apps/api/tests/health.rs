use axum::body::Body;
use axum::http::{Request, StatusCode};
use brickbase_api::http::router;
use brickbase_api::state::AppState;
use http_body_util::BodyExt;
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

#[tokio::test]
async fn get_health_returns_200_with_status_ok() {
    let pool = PgPoolOptions::new()
        .connect_lazy("postgres://unused:unused@127.0.0.1:1/unused")
        .expect("lazy pool");
    let response = router(AppState { pool })
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .expect("health request"),
        )
        .await
        .expect("health response");

    assert_eq!(response.status(), StatusCode::OK);

    let body = response
        .into_body()
        .collect()
        .await
        .expect("health body")
        .to_bytes();
    let json: serde_json::Value = serde_json::from_slice(&body).expect("health json");
    assert_eq!(json, serde_json::json!({ "status": "ok" }));
}
