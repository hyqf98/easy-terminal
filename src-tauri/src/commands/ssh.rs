//! SSH-related Tauri commands

use serde::Deserialize;
use tracing::info;

use crate::response::ApiResponse;
use crate::ssh::{ssh_manager, SshConfig, SshTestResult};

/// SSH connection options for testing
#[derive(Debug, Deserialize)]
pub struct SshConnectionOptions {
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: String,
    pub password: Option<String>,
    pub private_key_path: Option<String>,
    pub passphrase: Option<String>,
    pub cwd: Option<String>,
}

impl From<SshConnectionOptions> for SshConfig {
    fn from(opts: SshConnectionOptions) -> Self {
        SshConfig {
            id: uuid::Uuid::new_v4().to_string(),
            name: opts.name,
            host: opts.host,
            port: opts.port,
            username: opts.username,
            auth_type: match opts.auth_type.as_str() {
                "key" => crate::ssh::SshAuthType::Key,
                "agent" => crate::ssh::SshAuthType::Agent,
                _ => crate::ssh::SshAuthType::Password,
            },
            password: opts.password,
            private_key_path: opts.private_key_path,
            passphrase: opts.passphrase,
            cwd: opts.cwd,
            is_favorite: false,
            last_connected_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
        }
    }
}

/// Test SSH connection
#[tauri::command]
pub async fn test_ssh_connection(options: SshConnectionOptions) -> ApiResponse<SshTestResult> {
    info!("Testing SSH connection to {}:{}", options.host, options.port);

    let config: SshConfig = options.into();

    match ssh_manager().test_connection(&config) {
        Ok(result) => ApiResponse::success(result),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("SSH_ERROR".to_string()),
        },
    }
}

/// Connect to SSH server
#[tauri::command]
pub async fn connect_ssh(connection_id: String) -> ApiResponse<String> {
    info!("Connecting to SSH: {}", connection_id);

    // Default terminal size
    let cols: u16 = 80;
    let rows: u16 = 24;

    match ssh_manager().connect(&connection_id, cols, rows) {
        Ok(session_id) => {
            ApiResponse::success(session_id)
        }
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("SSH_ERROR".to_string()),
        },
    }
}

/// Disconnect SSH session
#[tauri::command]
pub async fn disconnect_ssh(session_id: String) -> ApiResponse<()> {
    info!("Disconnecting SSH session: {}", session_id);

    match ssh_manager().disconnect(&session_id) {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("SSH_ERROR".to_string()),
        },
    }
}

/// Send input to SSH session
#[tauri::command]
pub async fn ssh_input(session_id: String, data: String) -> ApiResponse<()> {
    match ssh_manager().write_input(&session_id, data.as_bytes()) {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("SSH_ERROR".to_string()),
        },
    }
}

/// Resize SSH terminal
#[tauri::command]
pub async fn resize_ssh(session_id: String, cols: u16, rows: u16) -> ApiResponse<()> {
    match ssh_manager().resize(&session_id, cols, rows) {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("SSH_ERROR".to_string()),
        },
    }
}

/// Save SSH connection configuration
#[tauri::command]
pub async fn save_ssh_config(config: SshConfig) -> ApiResponse<SshConfig> {
    info!("Saving SSH config: {} ({})", config.name, config.id);

    match ssh_manager().save_config(config) {
        Ok(saved) => ApiResponse::success(saved),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("CONFIG_ERROR".to_string()),
        },
    }
}

/// Delete SSH connection configuration
#[tauri::command]
pub async fn delete_ssh_config(connection_id: String) -> ApiResponse<()> {
    info!("Deleting SSH config: {}", connection_id);

    match ssh_manager().delete_config(&connection_id) {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("CONFIG_ERROR".to_string()),
        },
    }
}

/// Get all SSH connection configurations
#[tauri::command]
pub async fn get_ssh_configs() -> ApiResponse<Vec<SshConfig>> {
    // Load from file first
    let _ = ssh_manager().load_configs();

    ApiResponse::success(ssh_manager().get_configs())
}

/// Get SSH connection configuration by ID
#[tauri::command]
pub async fn get_ssh_config(connection_id: String) -> ApiResponse<Option<SshConfig>> {
    // Load from file first
    let _ = ssh_manager().load_configs();

    ApiResponse::success(ssh_manager().get_config(&connection_id))
}

/// Get SSH session status
#[tauri::command]
pub async fn get_ssh_session_status(session_id: String) -> ApiResponse<String> {
    match ssh_manager().get_session_status(&session_id) {
        Some(status) => ApiResponse::success(format!("{:?}", status).to_lowercase()),
        None => ApiResponse {
            success: false,
            data: None,
            error: Some("Session not found".to_string()),
            error_code: Some("SESSION_NOT_FOUND".to_string()),
        },
    }
}

/// Get all active SSH sessions
#[tauri::command]
pub async fn get_ssh_sessions() -> ApiResponse<Vec<String>> {
    ApiResponse::success(ssh_manager().get_session_ids())
}
