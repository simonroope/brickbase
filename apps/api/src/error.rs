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
