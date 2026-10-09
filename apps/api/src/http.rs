use axum::Router;

use crate::routes;
use crate::state::AppState;

pub fn router(state: AppState) -> Router {
    Router::new()
        .merge(routes::health::router())
        .merge(routes::assets::router())
        .nest("/shares", routes::shares::router())
        .nest("/oracles", routes::oracles::router())
        .nest("/allowlist", routes::allowlist::router())
        .with_state(state)
}
