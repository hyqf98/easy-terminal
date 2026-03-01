//! Docker-related Tauri commands

use tracing::info;

use crate::response::ApiResponse;
use crate::docker::{docker_manager, ContainerInfo, ImageInfo, ContainerOperationResult};

/// Connect to Docker daemon
#[tauri::command]
pub async fn connect_docker() -> ApiResponse<bool> {
    info!("Connecting to Docker daemon");

    match docker_manager().connect().await {
        Ok(()) => ApiResponse::success(true),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("DOCKER_ERROR".to_string()),
        },
    }
}

/// Check if Docker is connected
#[tauri::command]
pub fn is_docker_connected() -> ApiResponse<bool> {
    ApiResponse::success(docker_manager().is_connected())
}

/// List Docker containers
#[tauri::command]
pub async fn list_docker_containers(all: bool) -> ApiResponse<Vec<ContainerInfo>> {
    info!("Listing Docker containers (all: {})", all);

    match docker_manager().list_containers(all).await {
        Ok(containers) => ApiResponse::success(containers),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("DOCKER_ERROR".to_string()),
        },
    }
}

/// List Docker images
#[tauri::command]
pub async fn list_docker_images() -> ApiResponse<Vec<ImageInfo>> {
    info!("Listing Docker images");

    match docker_manager().list_images().await {
        Ok(images) => ApiResponse::success(images),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("DOCKER_ERROR".to_string()),
        },
    }
}

/// Start a Docker container
#[tauri::command]
pub async fn start_docker_container(container_id: String) -> ApiResponse<ContainerOperationResult> {
    info!("Starting Docker container: {}", container_id);

    match docker_manager().start_container(&container_id).await {
        Ok(result) => ApiResponse::success(result),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("DOCKER_ERROR".to_string()),
        },
    }
}

/// Stop a Docker container
#[tauri::command]
pub async fn stop_docker_container(container_id: String) -> ApiResponse<ContainerOperationResult> {
    info!("Stopping Docker container: {}", container_id);

    match docker_manager().stop_container(&container_id).await {
        Ok(result) => ApiResponse::success(result),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("DOCKER_ERROR".to_string()),
        },
    }
}

/// Restart a Docker container
#[tauri::command]
pub async fn restart_docker_container(
    container_id: String,
) -> ApiResponse<ContainerOperationResult> {
    info!("Restarting Docker container: {}", container_id);

    match docker_manager().restart_container(&container_id).await {
        Ok(result) => ApiResponse::success(result),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("DOCKER_ERROR".to_string()),
        },
    }
}

/// Get container info by ID
#[tauri::command]
pub async fn get_docker_container(container_id: String) -> ApiResponse<Option<ContainerInfo>> {
    info!("Getting Docker container: {}", container_id);

    match docker_manager().get_container(&container_id).await {
        Ok(container) => ApiResponse::success(container),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("DOCKER_ERROR".to_string()),
        },
    }
}

/// Create exec session in a container
#[tauri::command]
pub async fn create_docker_exec(
    container_id: String,
    cols: u16,
    rows: u16,
) -> ApiResponse<String> {
    info!(
        "Creating Docker exec session in container: {} ({}x{})",
        container_id, cols, rows
    );

    match docker_manager()
        .create_exec_session(&container_id, cols, rows)
        .await
    {
        Ok(session_id) => ApiResponse::success(session_id),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("DOCKER_ERROR".to_string()),
        },
    }
}

/// Send input to Docker exec session
#[tauri::command]
pub async fn docker_exec_input(session_id: String, data: String) -> ApiResponse<()> {
    match docker_manager().exec_input(&session_id, &data).await {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("DOCKER_ERROR".to_string()),
        },
    }
}

/// Resize Docker exec terminal
#[tauri::command]
pub async fn resize_docker_exec(
    session_id: String,
    cols: u16,
    rows: u16,
) -> ApiResponse<()> {
    match docker_manager().resize_exec(&session_id, cols, rows).await {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("DOCKER_ERROR".to_string()),
        },
    }
}

/// Disconnect Docker exec session
#[tauri::command]
pub async fn disconnect_docker_exec(session_id: String) -> ApiResponse<()> {
    info!("Disconnecting Docker exec session: {}", session_id);

    match docker_manager().disconnect_exec(&session_id) {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse {
            success: false,
            data: None,
            error: Some(e.to_string()),
            error_code: Some("DOCKER_ERROR".to_string()),
        },
    }
}

/// Get Docker exec session status
#[tauri::command]
pub fn get_docker_exec_status(session_id: String) -> ApiResponse<String> {
    match docker_manager().get_exec_session_status(&session_id) {
        Some(status) => ApiResponse::success(format!("{:?}", status).to_lowercase()),
        None => ApiResponse {
            success: false,
            data: None,
            error: Some("Session not found".to_string()),
            error_code: Some("SESSION_NOT_FOUND".to_string()),
        },
    }
}

/// Get all active Docker exec sessions
#[tauri::command]
pub fn get_docker_exec_sessions() -> ApiResponse<Vec<String>> {
    ApiResponse::success(docker_manager().get_exec_session_ids())
}

/// Disconnect from Docker daemon
#[tauri::command]
pub fn disconnect_docker() -> ApiResponse<()> {
    info!("Disconnecting from Docker daemon");
    docker_manager().disconnect();
    ApiResponse::<()>::ok()
}
