//! Common response types for IPC

use serde::Serialize;

use crate::error::AppError;

/// Standard API response wrapper
#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
}

impl<T> ApiResponse<T> {
    /// Create a successful response
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
            error_code: None,
        }
    }

    /// Create a successful response without data
    pub fn ok() -> ApiResponse<()> {
        ApiResponse {
            success: true,
            data: Some(()),
            error: None,
            error_code: None,
        }
    }

    /// Create an error response
    pub fn error(message: &str) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.to_string()),
            error_code: None,
        }
    }

    /// Create an error response with code
    pub fn error_with_code(message: &str, code: &str) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.to_string()),
            error_code: Some(code.to_string()),
        }
    }
}

impl<T: Serialize> From<Result<T, AppError>> for ApiResponse<T> {
    fn from(result: Result<T, AppError>) -> Self {
        match result {
            Ok(data) => ApiResponse::success(data),
            Err(err) => ApiResponse {
                success: false,
                data: None,
                error: Some(err.to_string()),
                error_code: Some(error_code(&err)),
            },
        }
    }
}

/// Get error code from AppError
fn error_code(error: &AppError) -> String {
    match error {
        AppError::Io(_) => "IO_ERROR",
        AppError::Pty(_) => "PTY_ERROR",
        AppError::SessionNotFound(_) => "SESSION_NOT_FOUND",
        AppError::Config(_) => "CONFIG_ERROR",
        AppError::FileSystem(_) => "FILE_SYSTEM_ERROR",
        AppError::Ssh(_) => "SSH_ERROR",
        AppError::Docker(_) => "DOCKER_ERROR",
        AppError::InvalidArgument(_) => "INVALID_ARGUMENT",
        AppError::Timeout => "TIMEOUT",
        AppError::Internal(_) => "INTERNAL_ERROR",
    }
    .to_string()
}
