use axum::body::Body;
use axum::http::{Request, StatusCode};
use brickbase_api::http::router;
use http_body_util::BodyExt;
use tower::ServiceExt;

#[tokio::test]
async fn get_assets_returns_200_with_message() {
    let response = router()
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
    assert_eq!(json, serde_json::json!({ "message": "ok" }));
}
