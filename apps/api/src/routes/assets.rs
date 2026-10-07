use axum::routing::get;
use axum::Json;
use axum::Router;
use serde::Serialize;

#[derive(Serialize)]
struct AssetsBody {
    message: &'static str,
}

pub fn router() -> Router {
    Router::new().route("/assets", get(get_assets))
}

async fn get_assets() -> Json<AssetsBody> {
    Json(AssetsBody { message: "ok" })
}
