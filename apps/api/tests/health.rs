use axum::body::Body;
use axum::http::{Request, StatusCode};
use brickbase_api::http::router;
use http_body_util::BodyExt;
use tower::ServiceExt;

#[tokio::test]
async fn get_health_returns_200_with_status_ok() {
    let response = router()
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
