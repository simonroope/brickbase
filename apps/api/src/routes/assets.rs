use axum::extract::State;
use axum::routing::get;
use axum::Json;
use axum::Router;
use serde::Serialize;

use crate::error::AppError;
use crate::state::AppState;

#[derive(Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
struct Asset {
    asset_id: i32,
    status: i32,
    capital_value: String,
    income_value: String,
    metadata_uri: String,
    total_supply: String,
    available_supply: String,
    share_price: String,
    trading_enabled: bool,
}

pub fn router() -> Router<AppState> {
    Router::new().route("/assets", get(get_assets))
}

async fn get_assets(State(state): State<AppState>) -> Result<Json<Vec<Asset>>, AppError> {
    let assets = sqlx::query_as::<_, Asset>(
        "SELECT asset_id, status, capital_value, income_value, metadata_uri,
                total_supply, available_supply, share_price, trading_enabled
         FROM assets
         ORDER BY asset_id",
    )
    .fetch_all(&state.pool)
    .await?;
    Ok(Json(assets))
}
