//! Command history management commands

use std::path::PathBuf;
use std::sync::RwLock;

use serde::{Deserialize, Serialize};
use tracing::{info, warn};

use crate::error::AppError;
use crate::response::ApiResponse;

/// Command history entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub id: String,
    pub command: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cwd: Option<String>,
    pub timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<i32>,
}

/// Command history storage
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct HistoryStorage {
    pub entries: Vec<HistoryEntry>,
    pub max_entries: usize,
}

impl HistoryStorage {
    pub fn new(max_entries: usize) -> Self {
        Self {
            entries: Vec::new(),
            max_entries,
        }
    }

    /// Add a new entry
    pub fn add(&mut self, entry: HistoryEntry) {
        self.entries.push(entry);
        // Trim if exceeds max
        if self.entries.len() > self.max_entries {
            self.entries.drain(0..self.entries.len() - self.max_entries);
        }
    }

    /// Search entries by query
    pub fn search(&self, query: &str, limit: usize) -> Vec<&HistoryEntry> {
        if query.is_empty() {
            return self.entries.iter().rev().take(limit).collect();
        }
        let query_lower = query.to_lowercase();
        self.entries
            .iter()
            .rev()
            .filter(|e| e.command.to_lowercase().contains(&query_lower))
            .take(limit)
            .collect()
    }

    /// Get entries by session
    pub fn get_by_session(&self, session_id: &str) -> Vec<&HistoryEntry> {
        self.entries
            .iter()
            .rev()
            .filter(|e| e.session_id.as_deref() == Some(session_id))
            .collect()
    }

    /// Get entries by working directory
    pub fn get_by_cwd(&self, cwd: &str) -> Vec<&HistoryEntry> {
        self.entries
            .iter()
            .rev()
            .filter(|e| e.cwd.as_deref() == Some(cwd))
            .collect()
    }

    /// Get unique commands
    pub fn unique_commands(&self, limit: usize) -> Vec<&str> {
        let mut seen = std::collections::HashSet::new();
        let mut result = Vec::new();
        for entry in self.entries.iter().rev() {
            if seen.insert(&entry.command) {
                result.push(entry.command.as_str());
                if result.len() >= limit {
                    break;
                }
            }
        }
        result
    }
}

/// Global history storage
static HISTORY_STORAGE: RwLock<Option<HistoryStorage>> = RwLock::new(None);

/// Get history file path
fn get_history_path() -> PathBuf {
    crate::config::get_config_dir().join("command_history.json")
}

/// Initialize history storage
fn init_storage() -> HistoryStorage {
    let history_path = get_history_path();

    if history_path.exists() {
        match std::fs::read_to_string(&history_path) {
            Ok(content) => match serde_json::from_str(&content) {
                Ok(storage) => {
                    info!("Loaded command history from {:?}", history_path);
                    return storage;
                }
                Err(e) => {
                    warn!("Failed to parse history: {}, using defaults", e);
                }
            },
            Err(e) => {
                warn!("Failed to read history: {}, using defaults", e);
            }
        }
    }

    HistoryStorage::new(1000)
}

/// Get or initialize history storage
fn get_storage() -> HistoryStorage {
    {
        let guard = HISTORY_STORAGE.read().unwrap();
        if guard.is_some() {
            return guard.as_ref().unwrap().clone();
        }
    }

    let storage = init_storage();
    {
        let mut guard = HISTORY_STORAGE.write().unwrap();
        *guard = Some(storage.clone());
    }
    storage
}

/// Save history storage to file
fn save_storage(storage: &HistoryStorage) -> Result<(), AppError> {
    let config_dir = crate::config::get_config_dir();
    std::fs::create_dir_all(&config_dir).map_err(|e| AppError::FileSystem(e.to_string()))?;

    let history_path = get_history_path();
    let content =
        serde_json::to_string_pretty(storage).map_err(|e| AppError::FileSystem(e.to_string()))?;
    std::fs::write(&history_path, content).map_err(|e| AppError::FileSystem(e.to_string()))?;

    info!("Saved command history to {:?}", history_path);
    Ok(())
}

/// Update the global storage
fn update_storage<F>(f: F) -> Result<(), AppError>
where
    F: FnOnce(&mut HistoryStorage),
{
    let mut storage = get_storage();
    f(&mut storage);
    save_storage(&storage)?;

    // Update global
    {
        let mut guard = HISTORY_STORAGE.write().unwrap();
        *guard = Some(storage);
    }
    Ok(())
}

/// Add command to history
#[tauri::command]
pub fn add_command_history(
    command: String,
    session_id: Option<String>,
    cwd: Option<String>,
    exit_code: Option<i32>,
) -> ApiResponse<HistoryEntry> {
    let entry = HistoryEntry {
        id: uuid::Uuid::new_v4().to_string(),
        command,
        session_id,
        cwd,
        timestamp: chrono::Utc::now().timestamp_millis(),
        exit_code,
    };

    let entry_clone = entry.clone();
    match update_storage(|s| s.add(entry)) {
        Ok(()) => ApiResponse::success(entry_clone),
        Err(e) => ApiResponse::from(Err(e)),
    }
}

/// Search command history
#[tauri::command]
pub fn search_command_history(query: String, limit: Option<usize>) -> ApiResponse<Vec<HistoryEntry>> {
    let storage = get_storage();
    let limit = limit.unwrap_or(50);
    let results: Vec<HistoryEntry> = storage
        .search(&query, limit)
        .into_iter()
        .cloned()
        .collect();
    ApiResponse::success(results)
}

/// Get recent commands
#[tauri::command]
pub fn get_recent_commands(limit: Option<usize>) -> ApiResponse<Vec<HistoryEntry>> {
    let storage = get_storage();
    let limit = limit.unwrap_or(50);
    let results: Vec<HistoryEntry> = storage.entries.iter().rev().take(limit).cloned().collect();
    ApiResponse::success(results)
}

/// Get unique commands (for autocomplete)
#[tauri::command]
pub fn get_unique_commands(limit: Option<usize>) -> ApiResponse<Vec<String>> {
    let storage = get_storage();
    let limit = limit.unwrap_or(100);
    let results: Vec<String> = storage.unique_commands(limit).into_iter().map(String::from).collect();
    ApiResponse::success(results)
}

/// Get commands by session
#[tauri::command]
pub fn get_commands_by_session(session_id: String) -> ApiResponse<Vec<HistoryEntry>> {
    let storage = get_storage();
    let results: Vec<HistoryEntry> = storage
        .get_by_session(&session_id)
        .into_iter()
        .cloned()
        .collect();
    ApiResponse::success(results)
}

/// Get commands by working directory
#[tauri::command]
pub fn get_commands_by_cwd(cwd: String) -> ApiResponse<Vec<HistoryEntry>> {
    let storage = get_storage();
    let results: Vec<HistoryEntry> = storage
        .get_by_cwd(&cwd)
        .into_iter()
        .cloned()
        .collect();
    ApiResponse::success(results)
}

/// Clear all command history
#[tauri::command]
pub fn clear_command_history() -> ApiResponse<()> {
    match update_storage(|s| s.entries.clear()) {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse::from(Err(e)),
    }
}

/// Set max history entries
#[tauri::command]
pub fn set_max_history_entries(max: usize) -> ApiResponse<()> {
    match update_storage(|s| {
        s.max_entries = max;
        if s.entries.len() > max {
            s.entries.drain(0..s.entries.len() - max);
        }
    }) {
        Ok(()) => ApiResponse::<()>::ok(),
        Err(e) => ApiResponse::from(Err(e)),
    }
}

/// Get history statistics
#[tauri::command]
pub fn get_history_stats() -> ApiResponse<HistoryStats> {
    let storage = get_storage();
    let total_entries = storage.entries.len();
    let unique_count = storage.unique_commands(usize::MAX).len();

    ApiResponse::success(HistoryStats {
        total_entries,
        unique_commands: unique_count,
        max_entries: storage.max_entries,
    })
}

/// History statistics
#[derive(Debug, Serialize)]
pub struct HistoryStats {
    pub total_entries: usize,
    pub unique_commands: usize,
    pub max_entries: usize,
}
