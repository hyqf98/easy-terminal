//! PTY Session management with event streaming

use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use std::thread::{self, JoinHandle};

use parking_lot::{Mutex, RwLock};
use portable_pty::{native_pty_system, CommandBuilder, PtyPair, PtySize};
use tauri::{AppHandle, Emitter};
use tracing::{debug, error, info, warn};

use crate::error::{AppError, AppResult};

/// PTY session output reader handle
struct OutputReader {
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

    fn start<R: Read + Send + 'static, F: Fn(String) + Send + 'static>(
        &mut self,
        mut reader: R,
        on_data: F,
    ) {
        *self.running.lock() = true;
        let running = self.running.clone();

        self.handle = Some(thread::spawn(move || {
            let mut buffer = [0u8; 4096];
            while *running.lock() {
                match reader.read(&mut buffer) {
                    Ok(0) => {
                        // EOF - process exited
                        debug!("PTY output stream ended");
                        break;
                    }
                    Ok(n) => {
                        let data = String::from_utf8_lossy(&buffer[..n]).into_owned();
                        on_data(data);
                    }
                    Err(e) => {
                        if e.kind() != std::io::ErrorKind::WouldBlock {
                            error!("PTY read error: {}", e);
                            break;
                        }
                    }
                }
            }
            debug!("Output reader thread stopped");
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

/// PTY session state
pub struct PtySession {
    /// Session ID
    pub id: String,
    /// PTY pair
    pub pair: PtyPair,
    /// Shell command
    pub shell: String,
    /// Current working directory
    pub cwd: String,
    /// Output reader thread
    output_reader: Mutex<OutputReader>,
    /// Cached input writer
    input_writer: Mutex<Option<Box<dyn Write + Send>>>,
}

impl PtySession {
    /// Write input to the PTY
    pub fn write_input(&self, data: &[u8]) -> AppResult<()> {
        debug!("[PtySession] write_input called for session {}, {} bytes", self.id, data.len());
        let mut writer_guard = self.input_writer.lock();
        if writer_guard.is_none() {
            debug!("[PtySession] Creating new writer for session {}", self.id);
            *writer_guard = Some(self.pair.master.take_writer()
                .map_err(|e| AppError::Pty(format!("Failed to get writer: {}", e)))?);
        }
        let writer = writer_guard.as_mut().unwrap();
        writer.write_all(data)
            .map_err(|e| AppError::Pty(format!("Write error: {}", e)))?;
        writer.flush()
            .map_err(|e| AppError::Pty(format!("Flush error: {}", e)))?;
        debug!("[PtySession] write_input success for session {}", self.id);
        Ok(())
    }

    /// Resize the PTY
    pub fn resize(&self, cols: u16, rows: u16) -> AppResult<()> {
        self.pair.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        }).map_err(|e| AppError::Pty(format!("Resize error: {}", e)))?;
        Ok(())
    }
}

/// PTY session manager
pub struct PtyManager {
    sessions: RwLock<HashMap<String, Arc<PtySession>>>,
    app_handle: Mutex<Option<AppHandle>>,
}

impl PtyManager {
    /// Create a new PTY manager
    pub fn new() -> Self {
        Self {
            sessions: RwLock::new(HashMap::new()),
            app_handle: Mutex::new(None),
        }
    }

    /// Set the Tauri app handle for event emission
    pub fn set_app_handle(&self, handle: AppHandle) {
        *self.app_handle.lock() = Some(handle);
    }

    /// Detect default shell and its arguments
    fn detect_default_shell() -> (String, Vec<String>) {
        if cfg!(windows) {
            // Try PowerShell Core first (pwsh), then Windows PowerShell
            let pwsh_core = "C:\\Program Files\\PowerShell\\7\\pwsh.exe";
            if std::path::Path::new(pwsh_core).exists() {
                return (pwsh_core.to_string(), vec!["-NoLogo".to_string()]);
            }
            let powershell = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
            if std::path::Path::new(powershell).exists() {
                return (powershell.to_string(), vec!["-NoLogo".to_string()]);
            }
            ("cmd.exe".to_string(), vec![])
        } else {
            // On Unix, shells typically don't need special args to suppress logo
            let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());
            (shell, vec![])
        }
    }

    /// Create a new PTY session
    pub fn create_session(
        &self,
        shell: Option<String>,
        cwd: Option<String>,
        cols: u16,
        rows: u16,
    ) -> AppResult<String> {
        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| AppError::Pty(format!("Failed to open PTY: {}", e)))?;

        // Determine shell and arguments
        let (shell, shell_args) = if let Some(s) = shell {
            // User-specified shell: detect if it's PowerShell and add -NoLogo
            let args = if s.to_lowercase().contains("powershell") || s.to_lowercase().ends_with("pwsh.exe") {
                vec!["-NoLogo".to_string()]
            } else {
                vec![]
            };
            (s, args)
        } else {
            Self::detect_default_shell()
        };

        // Determine working directory
        let cwd = cwd.unwrap_or_else(|| {
            std::env::current_dir()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| {
                    if cfg!(windows) { "C:\\".to_string() } else { "/".to_string() }
                })
        });

        let session_id = uuid::Uuid::new_v4().to_string();

        // Build command with arguments
        let mut cmd = CommandBuilder::new(&shell);
        for arg in &shell_args {
            cmd.arg(arg);
        }
        cmd.cwd(&cwd);

        // Spawn the shell
        let _child = pair.slave.spawn_command(cmd)
            .map_err(|e| AppError::Pty(format!("Failed to spawn shell: {}", e)))?;

        // Get reader
        let reader = pair.master.try_clone_reader()
            .map_err(|e| AppError::Pty(format!("Failed to clone reader: {}", e)))?;

        // Create session
        let session = Arc::new(PtySession {
            id: session_id.clone(),
            pair,
            shell: shell.clone(),
            cwd: cwd.clone(),
            output_reader: Mutex::new(OutputReader::new()),
            input_writer: Mutex::new(None),
        });

        // Start output reader thread
        let session_id_clone = session_id.clone();
        let app_handle = self.app_handle.lock().clone();

        session.output_reader.lock().start(reader, move |data| {
            if let Some(ref handle) = app_handle {
                let _ = handle.emit("terminal-output", TerminalOutputPayload {
                    session_id: session_id_clone.clone(),
                    data,
                });
            }
        });

        // Store session
        self.sessions.write().insert(session_id.clone(), session);

        info!("Created PTY session: {} (shell: {}, cwd: {})", session_id, shell, cwd);

        Ok(session_id)
    }

    /// Write input to a session
    pub fn write_input(&self, session_id: &str, data: &[u8]) -> AppResult<()> {
        let sessions = self.sessions.read();
        if let Some(session) = sessions.get(session_id) {
            session.write_input(data)
        } else {
            Err(AppError::SessionNotFound(session_id.to_string()))
        }
    }

    /// Resize a session
    pub fn resize(&self, session_id: &str, cols: u16, rows: u16) -> AppResult<()> {
        let sessions = self.sessions.read();
        if let Some(session) = sessions.get(session_id) {
            session.resize(cols, rows)
        } else {
            Err(AppError::SessionNotFound(session_id.to_string()))
        }
    }

    /// Close a session
    pub fn close_session(&self, session_id: &str) -> AppResult<()> {
        let mut sessions = self.sessions.write();
        if let Some(session) = sessions.remove(session_id) {
            // Stop the output reader
            session.output_reader.lock().stop();
            info!("Closed PTY session: {}", session_id);
            Ok(())
        } else {
            warn!("Attempted to close non-existent session: {}", session_id);
            Err(AppError::SessionNotFound(session_id.to_string()))
        }
    }

    /// Get all session IDs
    pub fn get_session_ids(&self) -> Vec<String> {
        self.sessions.read().keys().cloned().collect()
    }

    /// Get session info
    pub fn get_session_info(&self, session_id: &str) -> Option<SessionInfo> {
        self.sessions.read().get(session_id).map(|s| SessionInfo {
            id: s.id.clone(),
            shell: s.shell.clone(),
            cwd: s.cwd.clone(),
        })
    }

    /// Check if session exists
    pub fn session_exists(&self, session_id: &str) -> bool {
        self.sessions.read().contains_key(session_id)
    }
}

// Safety: PtyManager uses RwLock and Mutex to protect all internal state.
// All access to PtySession and PtyPair is synchronized through these locks.
unsafe impl Send for PtyManager {}
unsafe impl Sync for PtyManager {}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Session info for external use
#[derive(Debug, Clone, serde::Serialize)]
pub struct SessionInfo {
    pub id: String,
    pub shell: String,
    pub cwd: String,
}

/// Terminal output event payload
#[derive(Debug, Clone, serde::Serialize)]
pub struct TerminalOutputPayload {
    pub session_id: String,
    pub data: String,
}

/// Terminal exit event payload
#[derive(Debug, Clone, serde::Serialize)]
pub struct TerminalExitPayload {
    pub session_id: String,
    pub exit_code: i32,
}

/// Global PTY manager singleton
static PTY_MANAGER: once_cell::sync::Lazy<PtyManager> = once_cell::sync::Lazy::new(PtyManager::new);

/// Get the global PTY manager
pub fn pty_manager() -> &'static PtyManager {
    &PTY_MANAGER
}
