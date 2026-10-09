use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

pub struct AppError {
    pub status: StatusCode,
    pub message: String,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (self.status, self.message).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        tracing::error!(?error, "database");
        Self {
            status: StatusCode::INTERNAL_SERVER_ERROR,
            message: "database error".to_string(),
        }
    }
}
