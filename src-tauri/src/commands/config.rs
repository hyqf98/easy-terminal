//! Configuration-related Tauri commands

use tracing::info;

use crate::config::{config_manager, AppSettings, WindowState};
use crate::response::ApiResponse;

/// Get application settings
#[tauri::command]
pub async fn get_settings() -> ApiResponse<AppSettings> {
    info!("Getting application settings");
    let settings = config_manager().get_settings();
    ApiResponse::success(settings)
}

/// Save application settings
#[tauri::command]
pub async fn save_settings(settings: AppSettings) -> ApiResponse<()> {
    info!("Saving application settings: {:?}", settings);

    match config_manager().save_settings(settings) {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse::error(&e),
    }
}

/// Reset settings to defaults
#[tauri::command]
pub async fn reset_settings() -> ApiResponse<AppSettings> {
    info!("Resetting settings to defaults");

    match config_manager().reset_settings() {
        Ok(settings) => ApiResponse::success(settings),
        Err(e) => ApiResponse::error(&e),
    }
}

/// Get window state
#[tauri::command]
pub async fn get_window_state() -> ApiResponse<WindowState> {
    info!("Getting window state");
    let state = config_manager().get_window_state();
    ApiResponse::success(state)
}

/// Save window state
#[tauri::command]
pub async fn save_window_state(state: WindowState) -> ApiResponse<()> {
    info!("Saving window state: {:?}", state);

    match config_manager().save_window_state(state) {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse::error(&e),
    }
}

/// Get app version
#[tauri::command]
pub async fn get_app_version() -> ApiResponse<String> {
    ApiResponse::success(env!("CARGO_PKG_VERSION").to_string())
}

/// Get platform info
#[tauri::command]
pub async fn get_platform_info() -> ApiResponse<PlatformInfo> {
    let info = PlatformInfo {
        platform: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        os_type: std::env::consts::OS.to_string(),
        hostname: hostname::get()
            .map(|h| h.to_string_lossy().to_string())
            .unwrap_or_else(|_| "unknown".to_string()),
    };
    ApiResponse::success(info)
}

/// Platform information
#[derive(Debug, serde::Serialize)]
pub struct PlatformInfo {
    pub platform: String,
    pub arch: String,
    pub os_type: String,
    pub hostname: String,
}
