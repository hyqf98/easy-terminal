//! Error types for the application

use serde::Serialize;
use thiserror::Error;

/// Application error type
#[derive(Debug, Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("PTY error: {0}")]
    Pty(String),

    #[error("Terminal session not found: {0}")]
    SessionNotFound(String),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("File system error: {0}")]
    FileSystem(String),

    #[error("SSH error: {0}")]
    Ssh(String),

    #[error("Docker error: {0}")]
    Docker(String),

    #[error("Invalid argument: {0}")]
    InvalidArgument(String),

    #[error("Operation timeout")]
    Timeout,

    #[error("Internal error: {0}")]
    Internal(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Result type alias for AppError
pub type AppResult<T> = Result<T, AppError>;
