use axum::Router;

use crate::routes;

pub fn router() -> Router {
    Router::new()
        .merge(routes::health::router())
        .merge(routes::assets::router())
        .nest("/shares", routes::shares::router())
        .nest("/oracles", routes::oracles::router())
        .nest("/allowlist", routes::allowlist::router())
}
