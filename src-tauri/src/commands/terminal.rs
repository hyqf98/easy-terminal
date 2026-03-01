//! Terminal-related Tauri commands

use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tracing::info;

use crate::pty::{pty_manager, PtyManager};
use crate::response::ApiResponse;

/// Terminal session info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalSession {
    pub id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub terminal_type: String,
    pub status: String,
    pub cwd: Option<String>,
    pub shell: Option<String>,
    pub created_at: i64,
    pub last_activity_at: i64,
}

/// Terminal creation options
#[derive(Debug, Deserialize)]
pub struct TerminalCreateOptions {
    pub cwd: Option<String>,
    pub shell: Option<String>,
    #[serde(rename = "type")]
    pub terminal_type: Option<String>,
    pub title: Option<String>,
}

/// Terminal state managed by Tauri
pub struct TerminalState {
    pub manager: &'static PtyManager,
}

impl TerminalState {
    pub fn new() -> Self {
        Self {
            manager: pty_manager(),
        }
    }

    pub fn init(&self, handle: AppHandle) {
        self.manager.set_app_handle(handle);
    }
}

unsafe impl Send for TerminalState {}
unsafe impl Sync for TerminalState {}

impl Default for TerminalState {
    fn default() -> Self {
        Self::new()
    }
}

/// Initialize terminal state with app handle
pub fn init_terminal_state(handle: AppHandle) {
    pty_manager().set_app_handle(handle);
}

/// Create a new terminal session
#[tauri::command]
pub async fn create_terminal(
    options: TerminalCreateOptions,
) -> ApiResponse<TerminalSession> {
    info!("Creating terminal with options: {:?}", options);

    // Default terminal size
    let cols: u16 = 80;
    let rows: u16 = 24;

    match pty_manager().create_session(options.shell.clone(), options.cwd.clone(), cols, rows) {
        Ok(session_id) => {
            let info = pty_manager().get_session_info(&session_id);

            let session = TerminalSession {
                id: session_id,
                title: options.title.unwrap_or_else(|| "Terminal".to_string()),
                terminal_type: options.terminal_type.unwrap_or_else(|| "local".to_string()),
                status: "connected".to_string(),
                cwd: info.as_ref().map(|i| i.cwd.clone()),
                shell: info.map(|i| i.shell),
                created_at: chrono::Utc::now().timestamp_millis(),
                last_activity_at: chrono::Utc::now().timestamp_millis(),
            };

            ApiResponse::success(session)
        }
        Err(e) => {
            ApiResponse {
                success: false,
                data: None,
                error: Some(e.to_string()),
                error_code: Some("PTY_ERROR".to_string()),
            }
        }
    }
}

/// Close a terminal session
#[tauri::command]
pub async fn close_terminal(session_id: String) -> ApiResponse<()> {
    info!("Closing terminal session: {}", session_id);

    match pty_manager().close_session(&session_id) {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("SESSION_NOT_FOUND".to_string()),
        },
    }
}

/// Send input to terminal
#[tauri::command]
pub async fn terminal_input(session_id: String, data: String) -> ApiResponse<()> {
    info!("Sending input to terminal {}: {} bytes", session_id, data.len());

    match pty_manager().write_input(&session_id, data.as_bytes()) {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("SESSION_NOT_FOUND".to_string()),
        },
    }
}

/// Resize terminal
#[tauri::command]
pub async fn resize_terminal(
    session_id: String,
    cols: u16,
    rows: u16,
    _width: u32,
    _height: u32,
) -> ApiResponse<()> {
    info!("Resizing terminal {}: {}x{}", session_id, cols, rows);

    match pty_manager().resize(&session_id, cols, rows) {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("SESSION_NOT_FOUND".to_string()),
        },
    }
}

/// Get available shells
#[tauri::command]
pub async fn get_available_shells() -> ApiResponse<Vec<String>> {
    info!("Getting available shells");

    let mut shells = Vec::new();

    if cfg!(windows) {
        shells.push("powershell.exe".to_string());
        shells.push("cmd.exe".to_string());
        // Check for Git Bash
        let git_bash = "C:\\Program Files\\Git\\bin\\bash.exe";
        if std::path::Path::new(git_bash).exists() {
            shells.push(git_bash.to_string());
        }
        // Check for WSL
        if std::path::Path::new("C:\\Windows\\System32\\wsl.exe").exists() {
            shells.push("wsl.exe".to_string());
        }
    } else {
        // Unix-like systems
        for shell in &["/bin/bash", "/bin/zsh", "/bin/sh", "/usr/bin/fish"] {
            if std::path::Path::new(shell).exists() {
                shells.push(shell.to_string());
            }
        }
    }

    ApiResponse::success(shells)
}

/// Get default shell
#[tauri::command]
pub async fn get_default_shell() -> ApiResponse<String> {
    info!("Getting default shell");

    let shell = if cfg!(windows) {
        let powershell = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
        if std::path::Path::new(powershell).exists() {
            powershell.to_string()
        } else {
            "cmd.exe".to_string()
        }
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
    };

    ApiResponse::success(shell)
}

/// Get terminal current working directory
#[tauri::command]
pub async fn get_terminal_cwd(session_id: String) -> ApiResponse<String> {
    info!("Getting terminal CWD: {}", session_id);

    match pty_manager().get_session_info(&session_id) {
        Some(info) => ApiResponse::success(info.cwd),
        None => ApiResponse {
            success: false,
            data: None,
            error: Some("Session not found".to_string()),
            error_code: Some("SESSION_NOT_FOUND".to_string()),
        },
    }
}

/// Get all active terminal sessions
#[tauri::command]
pub async fn get_terminal_sessions() -> ApiResponse<Vec<String>> {
    info!("Getting all terminal sessions");
    ApiResponse::success(pty_manager().get_session_ids())
}
