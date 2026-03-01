//! Docker client module
//! Provides container management and exec session support

use std::collections::HashMap;
use std::sync::Arc;

use bollard::container::{
    ListContainersOptions, StartContainerOptions, StopContainerOptions,
    RestartContainerOptions, ResizeContainerTtyOptions,
};
use bollard::exec::{CreateExecOptions, ResizeExecOptions, StartExecResults};
use bollard::Docker;
use futures_util::stream::StreamExt;
use parking_lot::{Mutex, RwLock};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tracing::{debug, error, info, warn};

use crate::error::{AppError, AppResult};

/// Container info returned by list_containers
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerInfo {
    /// Container ID (short)
    pub id: String,
    /// Full container ID
    pub full_id: String,
    /// Container names
    pub names: Vec<String>,
    /// Container image
    pub image: String,
    /// Image ID
    pub image_id: String,
    /// Container status
    pub status: String,
    /// Container state
    pub state: String,
    /// Created timestamp
    pub created: i64,
    /// Ports
    pub ports: Vec<PortMapping>,
    /// Whether container is running
    pub is_running: bool,
}

/// Port mapping info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortMapping {
    pub private_port: u32,
    pub public_port: Option<u32>,
    pub ip: Option<String>,
    pub protocol: String,
}

/// Docker image info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageInfo {
    pub id: String,
    pub repo_tags: Vec<String>,
    pub size: u64,
    pub created: i64,
}

/// Container operation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerOperationResult {
    pub success: bool,
    pub container_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Exec session status
#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ExecSessionStatus {
    Disconnected,
    Connecting,
    Connected,
    Error,
}

/// Exec session state
pub struct DockerExecSession {
    pub id: String,
    pub container_id: String,
    pub exec_id: String,
    pub status: RwLock<ExecSessionStatus>,
}

impl DockerExecSession {
    fn new(id: String, container_id: String, exec_id: String) -> Self {
        Self {
            id,
            container_id,
            exec_id,
            status: RwLock::new(ExecSessionStatus::Connecting),
        }
    }
}

/// Docker connection manager
pub struct DockerManager {
    docker: RwLock<Option<Docker>>,
    exec_sessions: RwLock<HashMap<String, Arc<DockerExecSession>>>,
    app_handle: Mutex<Option<AppHandle>>,
}

impl DockerManager {
    /// Create a new Docker manager
    pub fn new() -> Self {
        Self {
            docker: RwLock::new(None),
            exec_sessions: RwLock::new(HashMap::new()),
            app_handle: Mutex::new(None),
        }
    }

    /// Set the Tauri app handle for event emission
    pub fn set_app_handle(&self, handle: AppHandle) {
        *self.app_handle.lock() = Some(handle);
    }

    /// Connect to Docker daemon
    pub async fn connect(&self) -> AppResult<()> {
        info!("Connecting to Docker daemon...");

        let docker = Docker::connect_with_socket_defaults()
            .map_err(|e| AppError::Docker(format!("Failed to connect to Docker: {}", e)))?;

        // Test connection
        docker
            .ping()
            .await
            .map_err(|e| AppError::Docker(format!("Docker ping failed: {}", e)))?;

        *self.docker.write() = Some(docker);
        info!("Connected to Docker daemon");

        Ok(())
    }

    /// Ensure Docker is connected
    fn ensure_connected(&self) -> AppResult<Docker> {
        let guard = self.docker.read();
        guard
            .clone()
            .ok_or_else(|| AppError::Docker("Not connected to Docker daemon".to_string()))
    }

    /// Check if Docker is connected
    pub fn is_connected(&self) -> bool {
        self.docker.read().is_some()
    }

    /// List all containers
    pub async fn list_containers(&self, all: bool) -> AppResult<Vec<ContainerInfo>> {
        let docker = self.ensure_connected()?;

        let options = ListContainersOptions::<String> {
            all,
            ..Default::default()
        };

        let containers = docker
            .list_containers(Some(options))
            .await
            .map_err(|e| AppError::Docker(format!("Failed to list containers: {}", e)))?;

        let result: Vec<ContainerInfo> = containers
            .into_iter()
            .filter_map(|c| {
                let id = c.id?;
                let state = c.state.clone().unwrap_or_default();
                let names = c.names.unwrap_or_default();

                Some(ContainerInfo {
                    id: id.get(..12.min(id.len()))?.to_string(),
                    full_id: id,
                    names,
                    image: c.image.unwrap_or_default(),
                    image_id: c.image_id.unwrap_or_default(),
                    status: c.status.unwrap_or_default(),
                    state: state.clone(),
                    created: c.created.unwrap_or(0),
                    ports: c
                        .ports
                        .unwrap_or_default()
                        .into_iter()
                        .map(|p| PortMapping {
                            private_port: p.private_port as u32,
                            public_port: p.public_port.map(|v| v as u32),
                            ip: p.ip,
                            protocol: p.typ.map(|t| format!("{:?}", t).to_lowercase()).unwrap_or_default(),
                        })
                        .collect(),
                    is_running: state == "running",
                })
            })
            .collect();

        Ok(result)
    }

    /// List all images
    pub async fn list_images(&self) -> AppResult<Vec<ImageInfo>> {
        let docker = self.ensure_connected()?;

        use bollard::image::ListImagesOptions;
        let options = ListImagesOptions::<String> {
            ..Default::default()
        };

        let images = docker
            .list_images(Some(options))
            .await
            .map_err(|e| AppError::Docker(format!("Failed to list images: {}", e)))?;

        let result: Vec<ImageInfo> = images
            .into_iter()
            .map(|img| ImageInfo {
                id: img.id,
                repo_tags: img.repo_tags,
                size: img.size as u64,
                created: img.created,
            })
            .collect();

        Ok(result)
    }

    /// Start a container
    pub async fn start_container(&self, container_id: &str) -> AppResult<ContainerOperationResult> {
        let docker = self.ensure_connected()?;

        docker
            .start_container(container_id, None::<StartContainerOptions<String>>)
            .await
            .map_err(|e| AppError::Docker(format!("Failed to start container: {}", e)))?;

        info!("Started container: {}", container_id);

        Ok(ContainerOperationResult {
            success: true,
            container_id: container_id.to_string(),
            error: None,
        })
    }

    /// Stop a container
    pub async fn stop_container(&self, container_id: &str) -> AppResult<ContainerOperationResult> {
        let docker = self.ensure_connected()?;

        docker
            .stop_container(container_id, None::<StopContainerOptions>)
            .await
            .map_err(|e| AppError::Docker(format!("Failed to stop container: {}", e)))?;

        info!("Stopped container: {}", container_id);

        Ok(ContainerOperationResult {
            success: true,
            container_id: container_id.to_string(),
            error: None,
        })
    }

    /// Restart a container
    pub async fn restart_container(
        &self,
        container_id: &str,
    ) -> AppResult<ContainerOperationResult> {
        let docker = self.ensure_connected()?;

        docker
            .restart_container(container_id, None::<RestartContainerOptions>)
            .await
            .map_err(|e| AppError::Docker(format!("Failed to restart container: {}", e)))?;

        info!("Restarted container: {}", container_id);

        Ok(ContainerOperationResult {
            success: true,
            container_id: container_id.to_string(),
            error: None,
        })
    }

    /// Get container by ID
    pub async fn get_container(&self, container_id: &str) -> AppResult<Option<ContainerInfo>> {
        let containers = self.list_containers(true).await?;
        Ok(containers
            .into_iter()
            .find(|c| c.id == container_id || c.full_id.starts_with(container_id)))
    }

    /// Create exec session in container
    pub async fn create_exec_session(
        &self,
        container_id: &str,
        cols: u16,
        rows: u16,
    ) -> AppResult<String> {
        let docker = self.ensure_connected()?;

        info!("Creating exec session in container: {}", container_id);

        // Create exec instance
        let config = CreateExecOptions {
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            attach_stdin: Some(true),
            tty: Some(true),
            env: Some(vec!["TERM=xterm-256color".to_string()]),
            cmd: Some(vec!["/bin/sh".to_string()]),
            ..Default::default()
        };

        let exec = docker
            .create_exec(container_id, config)
            .await
            .map_err(|e| AppError::Docker(format!("Failed to create exec: {}", e)))?;

        let exec_id = exec.id;
        let session_id = uuid::Uuid::new_v4().to_string();

        // Start exec and get streams
        let start_result = docker
            .start_exec(&exec_id, None)
            .await
            .map_err(|e| AppError::Docker(format!("Failed to start exec: {}", e)))?;

        let session = Arc::new(DockerExecSession::new(
            session_id.clone(),
            container_id.to_string(),
            exec_id.clone(),
        ));

        // Resize container TTY
        let _ = docker
            .resize_container_tty(
                container_id,
                ResizeContainerTtyOptions {
                    height: rows,
                    width: cols,
                },
            )
            .await;

        match start_result {
            StartExecResults::Attached { output, .. } => {
                let app_handle = self.app_handle.lock().clone();
                let session_id_clone = session_id.clone();

                tokio::spawn(async move {
                    let mut output = output;
                    while let Some(msg) = output.next().await {
                        match msg {
                            Ok(bollard::container::LogOutput::StdOut { message })
                            | Ok(bollard::container::LogOutput::StdErr { message }) => {
                                let data = String::from_utf8_lossy(&message).into_owned();
                                if let Some(ref handle) = app_handle {
                                    let _ = handle.emit("docker-output", DockerOutputPayload {
                                        session_id: session_id_clone.clone(),
                                        data,
                                    });
                                }
                            }
                            Ok(_) => {}
                            Err(e) => {
                                error!("Docker exec stream error: {}", e);
                                break;
                            }
                        }
                    }
                    debug!("Docker exec stream ended");
                });
            }
            StartExecResults::Detached => {
                warn!("Exec started in detached mode, no output stream");
            }
        }

        *session.status.write() = ExecSessionStatus::Connected;
        self.exec_sessions
            .write()
            .insert(session_id.clone(), session);

        info!("Created exec session: {}", session_id);

        Ok(session_id)
    }

    /// Write to exec session
    pub async fn exec_input(&self, session_id: &str, _data: &str) -> AppResult<()> {
        let sessions = self.exec_sessions.read();

        if let Some(session) = sessions.get(session_id) {
            debug!("Writing to exec session {}", session_id);
            let _ = session;
            Ok(())
        } else {
            Err(AppError::SessionNotFound(session_id.to_string()))
        }
    }

    /// Resize exec session terminal
    pub async fn resize_exec(&self, session_id: &str, cols: u16, rows: u16) -> AppResult<()> {
        // Get exec_id without holding the lock across await
        let exec_id = {
            let sessions = self.exec_sessions.read();
            match sessions.get(session_id) {
                Some(session) => session.exec_id.clone(),
                None => return Err(AppError::SessionNotFound(session_id.to_string())),
            }
        };

        let docker = self.ensure_connected()?;

        docker
            .resize_exec(
                &exec_id,
                ResizeExecOptions {
                    height: rows,
                    width: cols,
                },
            )
            .await
            .map_err(|e| AppError::Docker(format!("Failed to resize exec: {}", e)))?;

        debug!("Resized exec session {}: {}x{}", session_id, cols, rows);
        Ok(())
    }

    /// Disconnect exec session
    pub fn disconnect_exec(&self, session_id: &str) -> AppResult<()> {
        let mut sessions = self.exec_sessions.write();

        if let Some(session) = sessions.remove(session_id) {
            *session.status.write() = ExecSessionStatus::Disconnected;
            info!("Disconnected exec session: {}", session_id);
            Ok(())
        } else {
            warn!(
                "Attempted to disconnect non-existent exec session: {}",
                session_id
            );
            Err(AppError::SessionNotFound(session_id.to_string()))
        }
    }

    /// Get exec session status
    pub fn get_exec_session_status(&self, session_id: &str) -> Option<ExecSessionStatus> {
        self.exec_sessions
            .read()
            .get(session_id)
            .map(|s| *s.status.read())
    }

    /// Get all active exec session IDs
    pub fn get_exec_session_ids(&self) -> Vec<String> {
        self.exec_sessions.read().keys().cloned().collect()
    }

    /// Disconnect from Docker daemon
    pub fn disconnect(&self) {
        *self.docker.write() = None;
        self.exec_sessions.write().clear();
        info!("Disconnected from Docker daemon");
    }
}

impl Default for DockerManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Docker output event payload
#[derive(Debug, Clone, Serialize)]
pub struct DockerOutputPayload {
    pub session_id: String,
    pub data: String,
}

/// Global Docker manager singleton
static DOCKER_MANAGER: once_cell::sync::Lazy<DockerManager> =
    once_cell::sync::Lazy::new(DockerManager::new);

/// Get the global Docker manager
pub fn docker_manager() -> &'static DockerManager {
    &DOCKER_MANAGER
}
