//! Application settings management

use std::path::PathBuf;
use std::sync::Arc;

use once_cell::sync::Lazy;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tracing::{info, warn};

/// Application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub settings: AppSettings,
    pub window_state: WindowState,
    pub connections: Vec<ConnectionConfig>,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            settings: AppSettings::default(),
            window_state: WindowState::default(),
            connections: Vec::new(),
        }
    }
}

/// Application settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub theme: String,
    pub terminal_font_family: String,
    pub terminal_font_size: u32,
    pub terminal_line_height: f32,
    pub cursor_style: String,
    pub cursor_blink: bool,
    pub scrollback_limit: u32,
    pub local_shell: String,
    pub encoding: String,
    pub show_sidebar: bool,
    pub sidebar_width: u32,
    pub confirm_on_close: bool,
    pub copy_on_select: bool,
    pub right_click_behavior: String,
    pub bell_sound: bool,
    pub bell_style: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            terminal_font_family: "Cascadia Code, SF Mono, Monaco, Consolas, monospace"
                .to_string(),
            terminal_font_size: 14,
            terminal_line_height: 1.2,
            cursor_style: "block".to_string(),
            cursor_blink: true,
            scrollback_limit: 10000,
            local_shell: String::new(),
            encoding: "utf-8".to_string(),
            show_sidebar: true,
            sidebar_width: 260,
            confirm_on_close: true,
            copy_on_select: false,
            right_click_behavior: "menu".to_string(),
            bell_sound: false,
            bell_style: "none".to_string(),
        }
    }
}

/// Window state for persistence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowState {
    pub x: Option<i32>,
    pub y: Option<i32>,
    pub width: u32,
    pub height: u32,
    pub is_maximized: bool,
}

impl Default for WindowState {
    fn default() -> Self {
        Self {
            x: None,
            y: None,
            width: 1024,
            height: 768,
            is_maximized: false,
        }
    }
}

/// Connection configuration (for SSH/Docker)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub connection_type: String,
    pub is_favorite: bool,
    pub config: serde_json::Value,
}

/// Global configuration manager
pub struct ConfigManager {
    app_handle: RwLock<Option<AppHandle>>,
    config: RwLock<AppConfig>,
}

impl Default for ConfigManager {
    fn default() -> Self {
        Self::new()
    }
}

impl ConfigManager {
    /// Create a new config manager
    pub fn new() -> Self {
        let config = load_config();
        Self {
            app_handle: RwLock::new(None),
            config: RwLock::new(config),
        }
    }

    /// Set the app handle
    pub fn set_app_handle(&self, handle: AppHandle) {
        *self.app_handle.write() = Some(handle);
    }

    /// Get settings
    pub fn get_settings(&self) -> AppSettings {
        self.config.read().settings.clone()
    }

    /// Save settings
    pub fn save_settings(&self, settings: AppSettings) -> Result<(), String> {
        {
            let mut config = self.config.write();
            config.settings = settings;
        }
        self.persist_config()
    }

    /// Get window state
    pub fn get_window_state(&self) -> WindowState {
        self.config.read().window_state.clone()
    }

    /// Save window state
    pub fn save_window_state(&self, state: WindowState) -> Result<(), String> {
        {
            let mut config = self.config.write();
            config.window_state = state;
        }
        self.persist_config()
    }

    /// Reset settings to defaults
    pub fn reset_settings(&self) -> Result<AppSettings, String> {
        let default_settings = AppSettings::default();
        {
            let mut config = self.config.write();
            config.settings = default_settings.clone();
        }
        self.persist_config()?;
        Ok(default_settings)
    }

    /// Get connections
    pub fn get_connections(&self) -> Vec<ConnectionConfig> {
        self.config.read().connections.clone()
    }

    /// Persist config to file
    fn persist_config(&self) -> Result<(), String> {
        let config = self.config.read().clone();
        save_config(&config).map_err(|e| format!("Failed to save config: {}", e))
    }

    /// Reload config from file
    pub fn reload_config(&self) -> Result<(), String> {
        let config = load_config();
        *self.config.write() = config;
        Ok(())
    }
}

// Global config manager instance
static CONFIG_MANAGER: Lazy<Arc<ConfigManager>> = Lazy::new(|| Arc::new(ConfigManager::new()));

/// Get the global config manager
pub fn config_manager() -> &'static ConfigManager {
    &CONFIG_MANAGER
}

/// Get config directory path
pub fn get_config_dir() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("easy-terminal")
}

/// Get config file path
pub fn get_config_path() -> PathBuf {
    get_config_dir().join("config.json")
}

/// Load configuration from file
pub fn load_config() -> AppConfig {
    let config_path = get_config_path();

    if config_path.exists() {
        match std::fs::read_to_string(&config_path) {
            Ok(content) => match serde_json::from_str(&content) {
                Ok(config) => {
                    info!("Loaded configuration from {:?}", config_path);
                    return config;
                }
                Err(e) => {
                    warn!("Failed to parse config: {}, using defaults", e);
                }
            },
            Err(e) => {
                warn!("Failed to read config: {}, using defaults", e);
            }
        }
    }

    AppConfig::default()
}

/// Save configuration to file
pub fn save_config(config: &AppConfig) -> Result<(), std::io::Error> {
    let config_dir = get_config_dir();
    std::fs::create_dir_all(&config_dir)?;

    let config_path = get_config_path();
    let content = serde_json::to_string_pretty(config)?;
    std::fs::write(&config_path, content)?;

    info!("Saved configuration to {:?}", config_path);
    Ok(())
}
