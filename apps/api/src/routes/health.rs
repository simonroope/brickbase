use axum::routing::get;
use axum::Json;
use axum::Router;
use serde::Serialize;

use crate::state::AppState;

#[derive(Serialize)]
struct HealthBody {
    status: &'static str,
}

pub fn router() -> Router<AppState> {
    Router::new().route("/health", get(get_health))
}

async fn get_health() -> Json<HealthBody> {
    Json(HealthBody { status: "ok" })
}
