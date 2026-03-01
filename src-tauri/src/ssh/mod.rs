//! SSH client module

use std::collections::HashMap;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Arc;
use std::thread::{self, JoinHandle};

use parking_lot::{Mutex, RwLock};
use serde::{Deserialize, Serialize};
use ssh2::{Channel, Session};
use tauri::{AppHandle, Emitter};
use tracing::{debug, error, info, warn};

use crate::error::{AppError, AppResult};

/// SSH authentication type
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum SshAuthType {
    Password,
    Key,
    Agent,
}

/// SSH connection configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshConfig {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub auth_type: SshAuthType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub private_key_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub passphrase: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cwd: Option<String>,
    pub is_favorite: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_connected_at: Option<i64>,
    pub created_at: i64,
}

impl Default for SshConfig {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: String::new(),
            host: String::new(),
            port: 22,
            username: String::new(),
            auth_type: SshAuthType::Password,
            password: None,
            private_key_path: None,
            passphrase: None,
            cwd: None,
            is_favorite: false,
            last_connected_at: None,
            created_at: chrono::Utc::now().timestamp_millis(),
        }
    }
}

/// SSH connection test result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SshTestResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server_version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub banner: Option<String>,
}

/// SSH session state
pub struct SshSession {
    pub id: String,
    pub config_id: String,
    pub session: Mutex<Option<Session>>,
    pub channel: Mutex<Option<Channel>>,
    pub output_reader: Mutex<Option<OutputReader>>,
    pub status: RwLock<SshSessionStatus>,
}

impl SshSession {
    fn new(id: String, config_id: String) -> Self {
        Self {
            id,
            config_id,
            session: Mutex::new(None),
            channel: Mutex::new(None),
            output_reader: Mutex::new(None),
            status: RwLock::new(SshSessionStatus::Disconnected),
        }
    }
}

/// SSH session status
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum SshSessionStatus {
    Disconnected,
    Connecting,
    Connected,
    Error,
}

/// Output reader for SSH channel
pub struct OutputReader {
    handle: Option<JoinHandle<()>>,
    running: Arc<Mutex<bool>>,
}

impl OutputReader {
    fn new() -> Self {
        Self {
            handle: None,
            running: Arc::new(Mutex::new(false)),
        }
    }

    fn start<F: Fn(String) + Send + 'static>(&mut self, mut channel: Channel, on_data: F) {
        *self.running.lock() = true;
        let running = self.running.clone();

        self.handle = Some(thread::spawn(move || {
            let mut buffer = [0u8; 4096];
            while *running.lock() {
                match channel.read(&mut buffer) {
                    Ok(0) => {
                        debug!("SSH channel EOF");
                        break;
                    }
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buffer[..n]).into_owned();
                        on_data(data);
                    }
                    Err(e) => {
                        if e.kind() != std::io::ErrorKind::WouldBlock {
                            error!("SSH read error: {}", e);
                            break;
                        }
                    }
                }
            }
            debug!("SSH output reader stopped");
        }));
    }

    fn stop(&mut self) {
        *self.running.lock() = false;
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

impl Drop for OutputReader {
    fn drop(&mut self) {
        self.stop();
    }
}

/// SSH connection manager
pub struct SshManager {
    sessions: RwLock<HashMap<String, Arc<SshSession>>>,
    configs: RwLock<HashMap<String, SshConfig>>,
    app_handle: Mutex<Option<AppHandle>>,
    config_path: Mutex<Option<PathBuf>>,
}

impl SshManager {
    /// Create a new SSH manager
    pub fn new() -> Self {
        Self {
            sessions: RwLock::new(HashMap::new()),
            configs: RwLock::new(HashMap::new()),
            app_handle: Mutex::new(None),
            config_path: Mutex::new(None),
        }
    }

    /// Set the Tauri app handle for event emission
    pub fn set_app_handle(&self, handle: AppHandle) {
        *self.app_handle.lock() = Some(handle);
    }

    /// Initialize config path
    fn get_config_path(&self) -> PathBuf {
        if let Some(path) = self.config_path.lock().as_ref() {
            return path.clone();
        }

        let config_dir = dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("easy-terminal");

        let _ = std::fs::create_dir_all(&config_dir);
        let path = config_dir.join("ssh_configs.json");
        *self.config_path.lock() = Some(path.clone());
        path
    }

    /// Load configs from file
    pub fn load_configs(&self) -> AppResult<Vec<SshConfig>> {
        let path = self.get_config_path();

        if !path.exists() {
            return Ok(Vec::new());
        }

        let content = std::fs::read_to_string(&path)
            .map_err(|e| AppError::Config(format!("Failed to read SSH configs: {}", e)))?;

        let configs: Vec<SshConfig> = serde_json::from_str(&content)
            .map_err(|e| AppError::Config(format!("Failed to parse SSH configs: {}", e)))?;

        // Store in memory
        let mut stored = self.configs.write();
        stored.clear();
        for config in &configs {
            stored.insert(config.id.clone(), config.clone());
        }

        Ok(configs)
    }

    /// Save configs to file
    fn save_configs(&self) -> AppResult<()> {
        let path = self.get_config_path();
        let configs: Vec<SshConfig> = self.configs.read().values().cloned().collect();

        let content = serde_json::to_string_pretty(&configs)
            .map_err(|e| AppError::Config(format!("Failed to serialize SSH configs: {}", e)))?;

        std::fs::write(&path, content)
            .map_err(|e| AppError::Config(format!("Failed to write SSH configs: {}", e)))?;

        Ok(())
    }

    /// Test SSH connection
    pub fn test_connection(&self, config: &SshConfig) -> AppResult<SshTestResult> {
        info!("Testing SSH connection to {}:{}", config.host, config.port);

        let tcp = std::net::TcpStream::connect((config.host.as_str(), config.port))
            .map_err(|e| AppError::Ssh(format!("Connection failed: {}", e)))?;

        let mut session = Session::new()
            .map_err(|e| AppError::Ssh(format!("Failed to create session: {}", e)))?;

        session.set_tcp_stream(tcp);
        session.handshake()
            .map_err(|e| AppError::Ssh(format!("Handshake failed: {}", e)))?;

        // Authenticate
        self.authenticate(&session, config)?;

        // Note: server_version() is not available in ssh2 0.9
        let server_version = None;
        let banner = None; // ssh2 doesn't expose banner easily

        // Disconnect
        let _ = session.disconnect(None, "Test complete", None);

        Ok(SshTestResult {
            success: true,
            error: None,
            server_version,
            banner,
        })
    }

    /// Authenticate with the SSH server
    fn authenticate(&self, session: &Session, config: &SshConfig) -> AppResult<()> {
        match config.auth_type {
            SshAuthType::Password => {
                let password = config.password.as_ref()
                    .ok_or_else(|| AppError::Ssh("Password required for password authentication".to_string()))?;

                session.userauth_password(&config.username, password)
                    .map_err(|e| AppError::Ssh(format!("Authentication failed: {}", e)))?;
            }
            SshAuthType::Key => {
                let key_path = config.private_key_path.as_ref()
                    .ok_or_else(|| AppError::Ssh("Private key path required for key authentication".to_string()))?;

                session.userauth_pubkey_file(
                    &config.username,
                    None,
                    std::path::Path::new(key_path),
                    config.passphrase.as_deref(),
                ).map_err(|e| AppError::Ssh(format!("Key authentication failed: {}", e)))?;
            }
            SshAuthType::Agent => {
                let mut agent = session.agent()
                    .map_err(|e| AppError::Ssh(format!("Failed to connect to agent: {}", e)))?;

                agent.connect()
                    .map_err(|e| AppError::Ssh(format!("Agent connection failed: {}", e)))?;

                agent.list_identities()
                    .map_err(|e| AppError::Ssh(format!("Failed to list identities: {}", e)))?;

                let mut authenticated = false;
                // In ssh2 0.9, identities() returns Result<Vec<PublicKey>, _>
                let identities = agent.identities()
                    .map_err(|e| AppError::Ssh(format!("Failed to get identities: {}", e)))?;

                for identity in &identities {
                    if agent.userauth(&config.username, identity).is_ok() {
                        authenticated = true;
                        break;
                    }
                }

                if !authenticated {
                    return Err(AppError::Ssh("Agent authentication failed".to_string()));
                }
            }
        }

        if !session.authenticated() {
            return Err(AppError::Ssh("Authentication failed".to_string()));
        }

        Ok(())
    }

    /// Connect to SSH server and start shell
    pub fn connect(&self, config_id: &str, cols: u16, rows: u16) -> AppResult<String> {
        let config = self.configs.read().get(config_id).cloned()
            .ok_or_else(|| AppError::Ssh(format!("Config not found: {}", config_id)))?;

        info!("Connecting to SSH server: {}:{}", config.host, config.port);

        let session_id = uuid::Uuid::new_v4().to_string();
        let session = Arc::new(SshSession::new(session_id.clone(), config_id.to_string()));

        // Update status
        *session.status.write() = SshSessionStatus::Connecting;

        // Connect TCP
        let tcp = std::net::TcpStream::connect((config.host.as_str(), config.port))
            .map_err(|e| {
                *session.status.write() = SshSessionStatus::Error;
                AppError::Ssh(format!("Connection failed: {}", e))
            })?;

        // Create SSH session
        let mut ssh_session = Session::new()
            .map_err(|e| {
                *session.status.write() = SshSessionStatus::Error;
                AppError::Ssh(format!("Failed to create session: {}", e))
            })?;

        ssh_session.set_tcp_stream(tcp);
        ssh_session.handshake()
            .map_err(|e| {
                *session.status.write() = SshSessionStatus::Error;
                AppError::Ssh(format!("Handshake failed: {}", e))
            })?;

        // Authenticate
        self.authenticate(&ssh_session, &config)
            .map_err(|e| {
                *session.status.write() = SshSessionStatus::Error;
                e
            })?;

        // Request PTY
        let mut channel = ssh_session.channel_session()
            .map_err(|e| {
                *session.status.write() = SshSessionStatus::Error;
                AppError::Ssh(format!("Failed to open channel: {}", e))
            })?;

        channel.request_pty("xterm-256color", None, Some((cols as u32, rows as u32, 0, 0)))
            .map_err(|e| {
                *session.status.write() = SshSessionStatus::Error;
                AppError::Ssh(format!("Failed to request PTY: {}", e))
            })?;

        // Request shell
        channel.shell()
            .map_err(|e| {
                *session.status.write() = SshSessionStatus::Error;
                AppError::Ssh(format!("Failed to start shell: {}", e))
            })?;

        // Set non-blocking mode for reading (on session level)
        ssh_session.set_blocking(false);

        // Store session and channel
        *session.session.lock() = Some(ssh_session);
        *session.channel.lock() = Some(channel);
        *session.status.write() = SshSessionStatus::Connected;

        // Start output reader
        let session_id_clone = session_id.clone();
        let app_handle = self.app_handle.lock().clone();
        let channel_ref = session.channel.lock().take().unwrap();

        let mut reader = OutputReader::new();
        reader.start(channel_ref, move |data| {
            if let Some(ref handle) = app_handle {
                let _ = handle.emit("ssh-output", SshOutputPayload {
                    session_id: session_id_clone.clone(),
                    data,
                });
            }
        });

        *session.output_reader.lock() = Some(reader);

        // Store session
        self.sessions.write().insert(session_id.clone(), session);

        // Update last connected time
        {
            let mut configs = self.configs.write();
            if let Some(stored_config) = configs.get_mut(config_id) {
                stored_config.last_connected_at = Some(chrono::Utc::now().timestamp_millis());
            }
        }
        let _ = self.save_configs();

        info!("SSH session connected: {}", session_id);

        Ok(session_id)
    }

    /// Disconnect SSH session
    pub fn disconnect(&self, session_id: &str) -> AppResult<()> {
        let mut sessions = self.sessions.write();

        if let Some(session) = sessions.remove(session_id) {
            // Stop output reader
            if let Some(mut reader) = session.output_reader.lock().take() {
                reader.stop();
            }

            // Close channel
            if let Some(mut channel) = session.channel.lock().take() {
                let _ = channel.close();
            }

            // Disconnect session
            if let Some(ssh_session) = session.session.lock().take() {
                let _ = ssh_session.disconnect(None, "Session closed", None);
            }

            *session.status.write() = SshSessionStatus::Disconnected;

            info!("SSH session disconnected: {}", session_id);
            Ok(())
        } else {
            warn!("Attempted to disconnect non-existent session: {}", session_id);
            Err(AppError::SessionNotFound(session_id.to_string()))
        }
    }

    /// Write input to SSH session
    pub fn write_input(&self, session_id: &str, data: &[u8]) -> AppResult<()> {
        let sessions = self.sessions.read();

        if let Some(session) = sessions.get(session_id) {
            // Set blocking mode on session for write operation
            if let Some(ssh_session) = session.session.lock().as_ref() {
                ssh_session.set_blocking(true);
            }

            let result = {
                let mut channel_guard = session.channel.lock();

                if let Some(channel) = channel_guard.as_mut() {
                    channel.write_all(data)
                        .map_err(|e| AppError::Ssh(format!("Write error: {}", e)))
                } else {
                    Err(AppError::Ssh("No active channel".to_string()))
                }
            };

            // Restore non-blocking mode
            if let Some(ssh_session) = session.session.lock().as_ref() {
                ssh_session.set_blocking(false);
            }

            result
        } else {
            Err(AppError::SessionNotFound(session_id.to_string()))
        }
    }

    /// Resize SSH session terminal
    pub fn resize(&self, session_id: &str, cols: u16, rows: u16) -> AppResult<()> {
        let sessions = self.sessions.read();

        if let Some(session) = sessions.get(session_id) {
            let mut channel_guard = session.channel.lock();

            if let Some(channel) = channel_guard.as_mut() {
                channel.request_pty_size(cols as u32, rows as u32, None, None)
                    .map_err(|e| AppError::Ssh(format!("Resize error: {}", e)))?;
                Ok(())
            } else {
                Err(AppError::Ssh("No active channel".to_string()))
            }
        } else {
            Err(AppError::SessionNotFound(session_id.to_string()))
        }
    }

    /// Get session status
    pub fn get_session_status(&self, session_id: &str) -> Option<SshSessionStatus> {
        self.sessions.read().get(session_id).map(|s| *s.status.read())
    }

    /// Save SSH config
    pub fn save_config(&self, config: SshConfig) -> AppResult<SshConfig> {
        let mut configs = self.configs.write();

        // Check if updating existing or creating new
        let is_new = !configs.contains_key(&config.id);

        configs.insert(config.id.clone(), config.clone());

        drop(configs);
        self.save_configs()?;

        if is_new {
            info!("Created SSH config: {}", config.id);
        } else {
            info!("Updated SSH config: {}", config.id);
        }

        Ok(config)
    }

    /// Delete SSH config
    pub fn delete_config(&self, config_id: &str) -> AppResult<()> {
        let mut configs = self.configs.write();
        configs.remove(config_id);
        drop(configs);

        self.save_configs()?;
        info!("Deleted SSH config: {}", config_id);

        Ok(())
    }

    /// Get all SSH configs
    pub fn get_configs(&self) -> Vec<SshConfig> {
        self.configs.read().values().cloned().collect()
    }

    /// Get SSH config by ID
    pub fn get_config(&self, config_id: &str) -> Option<SshConfig> {
        self.configs.read().get(config_id).cloned()
    }

    /// Get all active session IDs
    pub fn get_session_ids(&self) -> Vec<String> {
        self.sessions.read().keys().cloned().collect()
    }
}

impl Default for SshManager {
    fn default() -> Self {
        Self::new()
    }
}

/// SSH output event payload
#[derive(Debug, Clone, Serialize)]
pub struct SshOutputPayload {
    pub session_id: String,
    pub data: String,
}

/// Global SSH manager singleton
static SSH_MANAGER: once_cell::sync::Lazy<SshManager> = once_cell::sync::Lazy::new(SshManager::new);

/// Get the global SSH manager
pub fn ssh_manager() -> &'static SshManager {
    &SSH_MANAGER
}
