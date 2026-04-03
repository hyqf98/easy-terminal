mod commands;
mod db;
mod fs;
mod pty;
mod settings;
mod ssh;

use pty::PtyManager;
use settings::AppSettings;
use std::sync::Mutex;
use tauri::State;

struct AppState {
    pty_manager: Mutex<PtyManager>,
    settings: Mutex<AppSettings>,
    command_db: db::Db,
}

// === PTY Commands ===

#[tauri::command]
fn create_pty(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    cols: u16,
    rows: u16,
    cwd: Option<String>,
) -> Result<String, String> {
    let mut manager = state.pty_manager.lock().map_err(|e| e.to_string())?;
    manager.create(app_handle, cols, rows, cwd)
}

#[tauri::command]
fn write_pty(state: State<'_, AppState>, session_id: String, data: String) -> Result<(), String> {
    let mut manager = state.pty_manager.lock().map_err(|e| e.to_string())?;
    manager.write(&session_id, &data)
}

#[tauri::command]
fn resize_pty(
    state: State<'_, AppState>,
    session_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let mut manager = state.pty_manager.lock().map_err(|e| e.to_string())?;
    manager.resize(&session_id, cols, rows)
}

#[tauri::command]
fn kill_pty(state: State<'_, AppState>, session_id: String) -> Result<(), String> {
    let mut manager = state.pty_manager.lock().map_err(|e| e.to_string())?;
    manager.kill(&session_id)
}

// === File System Commands ===

#[tauri::command]
fn read_dir(path: String) -> Result<Vec<fs::FileEntry>, String> {
    fs::read_dir_entries(&path)
}

#[tauri::command]
fn create_file(path: String) -> Result<(), String> {
    fs::create_file_entry(&path)
}

#[tauri::command]
fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_entry(&path)
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    fs::write_text_file(&path, &content)
}

#[tauri::command]
fn rename_entry(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename_entry(&old_path, &new_path)
}

#[tauri::command]
fn move_entries(sources: Vec<String>, dest_dir: String) -> Result<(), String> {
    fs::move_entries(sources, dest_dir)
}

#[tauri::command]
fn delete_entries(paths: Vec<String>) -> Result<(), String> {
    fs::delete_entries(paths)
}

#[tauri::command]
fn get_home_dir() -> Result<String, String> {
    fs::get_home_directory()
}

#[tauri::command]
fn list_drives() -> Result<Vec<fs::FileEntry>, String> {
    fs::list_drives()
}

#[tauri::command]
fn get_os_platform() -> String {
    fs::get_os_platform()
}

#[tauri::command]
fn read_file_preview(path: String) -> Result<fs::FilePreviewData, String> {
    fs::read_file_preview(&path)
}

// === Settings Commands ===

#[tauri::command]
fn get_settings(state: State<'_, AppState>) -> Result<AppSettings, String> {
    let s = state.settings.lock().map_err(|e| e.to_string())?;
    Ok(s.clone())
}

#[tauri::command]
fn save_settings(state: State<'_, AppState>, settings: AppSettings) -> Result<(), String> {
    settings::save_settings(settings.clone())?;
    let mut s = state.settings.lock().map_err(|e| e.to_string())?;
    *s = settings;
    Ok(())
}

// === Command Config Commands ===

#[tauri::command]
fn save_terminal_state(sessions: Vec<settings::TerminalSession>) -> Result<(), String> {
    settings::save_terminal_state(sessions)
}

#[tauri::command]
fn load_terminal_state() -> Result<Vec<settings::TerminalSession>, String> {
    settings::load_terminal_state()
}

#[tauri::command]
fn save_workspace_state(state: settings::WorkspaceState) -> Result<(), String> {
    settings::save_workspace_state(state)
}

#[tauri::command]
fn load_workspace_state() -> Result<settings::WorkspaceState, String> {
    settings::load_workspace_state()
}

#[tauri::command]
fn load_command_history() -> Result<Vec<settings::CommandHistoryEntry>, String> {
    settings::load_command_history()
}

#[tauri::command]
fn save_command_history(entries: Vec<settings::CommandHistoryEntry>) -> Result<(), String> {
    settings::save_command_history(entries)
}

#[tauri::command]
fn record_command_history(
    entry: settings::CommandHistoryEntry,
) -> Result<Vec<settings::CommandHistoryEntry>, String> {
    settings::record_command_history(entry)
}

#[tauri::command]
fn load_command_mappings() -> Result<Vec<settings::CommandMapping>, String> {
    settings::load_command_mappings()
}

#[tauri::command]
fn save_command_mappings(entries: Vec<settings::CommandMapping>) -> Result<(), String> {
    settings::save_command_mappings(entries)
}

#[tauri::command]
fn load_ssh_profiles() -> Result<Vec<settings::SSHProfile>, String> {
    settings::load_ssh_profiles()
}

#[tauri::command]
fn save_ssh_profiles(entries: Vec<settings::SSHProfile>) -> Result<(), String> {
    settings::save_ssh_profiles(entries)
}

#[tauri::command]
fn test_ssh_connection(
    host: String,
    port: u16,
    user: String,
    auth_type: String,
    password: String,
    private_key_path: String,
    jump_profile_id: String,
    profiles: Vec<settings::SSHProfile>,
) -> Result<String, String> {
    ssh::test_connection(
        host,
        port,
        user,
        auth_type,
        password,
        private_key_path,
        jump_profile_id,
        profiles,
    )
}

#[tauri::command]
fn get_remote_home(
    profile: settings::SSHProfile,
    profiles: Vec<settings::SSHProfile>,
) -> Result<String, String> {
    ssh::get_remote_home(profile, profiles)
}

#[tauri::command]
fn read_remote_dir(
    profile: settings::SSHProfile,
    path: String,
    profiles: Vec<settings::SSHProfile>,
) -> Result<Vec<fs::FileEntry>, String> {
    ssh::read_remote_dir(profile, path, profiles)
}

#[tauri::command]
fn download_remote_entries(
    app_handle: tauri::AppHandle,
    profile: settings::SSHProfile,
    remote_paths: Vec<String>,
    local_dir: String,
    profiles: Vec<settings::SSHProfile>,
) -> Result<(), String> {
    ssh::download_remote_entries(app_handle, profile, remote_paths, local_dir, profiles)
}

#[tauri::command]
fn upload_local_entries(
    app_handle: tauri::AppHandle,
    profile: settings::SSHProfile,
    local_paths: Vec<String>,
    remote_dir: String,
    profiles: Vec<settings::SSHProfile>,
) -> Result<(), String> {
    ssh::upload_local_entries(app_handle, profile, local_paths, remote_dir, profiles)
}

#[tauri::command]
fn load_shortcuts() -> Result<Vec<settings::ShortcutBinding>, String> {
    settings::load_shortcuts()
}

#[tauri::command]
fn save_shortcuts(entries: Vec<settings::ShortcutBinding>) -> Result<(), String> {
    settings::save_shortcuts(entries)
}

#[tauri::command]
fn load_default_shortcuts() -> Vec<settings::ShortcutBinding> {
    settings::default_shortcuts_public()
}

#[tauri::command]
fn get_platform() -> String {
    commands::get_platform()
}

#[tauri::command]
fn get_platforms() -> Vec<String> {
    commands::get_platforms()
}

#[tauri::command]
fn list_command_libraries(
    state: State<'_, AppState>,
) -> Result<Vec<db::CommandLibrarySummary>, String> {
    state.command_db.list_command_libraries()
}

#[tauri::command]
fn create_command_library(
    state: State<'_, AppState>,
    payload: db::CommandLibraryPayload,
) -> Result<db::CommandLibrarySummary, String> {
    state.command_db.create_command_library(payload)
}

#[tauri::command]
fn update_command_library(
    state: State<'_, AppState>,
    payload: db::CommandLibraryPayload,
) -> Result<db::CommandLibrarySummary, String> {
    state.command_db.update_command_library(payload)
}

#[tauri::command]
fn delete_command_library(state: State<'_, AppState>, library_id: String) -> Result<(), String> {
    state.command_db.delete_command_library(&library_id)
}

#[tauri::command]
fn query_command_summaries(
    state: State<'_, AppState>,
    params: db::CommandQueryParams,
) -> Result<db::CommandSummaryPage, String> {
    state.command_db.query_command_summaries(params)
}

#[tauri::command]
fn search_command_summaries(
    state: State<'_, AppState>,
    params: db::CommandSearchParams,
) -> Result<Vec<db::CommandSummary>, String> {
    state.command_db.search_command_summaries(params)
}

#[tauri::command]
fn get_command_detail(
    state: State<'_, AppState>,
    id: i64,
) -> Result<Option<db::CommandDetail>, String> {
    state.command_db.get_command_detail(id)
}

#[tauri::command]
fn create_command(
    state: State<'_, AppState>,
    payload: db::CommandPayload,
) -> Result<db::CommandDetail, String> {
    state.command_db.create_command(payload)
}

#[tauri::command]
fn update_command(
    state: State<'_, AppState>,
    payload: db::CommandPayload,
) -> Result<db::CommandDetail, String> {
    state.command_db.update_command(payload)
}

#[tauri::command]
fn delete_command_entry(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    state.command_db.delete_command(id)
}

#[tauri::command]
fn import_command_library(
    state: State<'_, AppState>,
    json: String,
) -> Result<db::CommandLibrarySummary, String> {
    state.command_db.import_command_library(&json)
}

#[tauri::command]
fn export_command_library(
    state: State<'_, AppState>,
    library_id: String,
) -> Result<String, String> {
    state.command_db.export_command_library(&library_id)
}

#[tauri::command]
fn reset_builtin_library(
    state: State<'_, AppState>,
    library_id: String,
) -> Result<db::CommandLibrarySummary, String> {
    state.command_db.reset_builtin_library(&library_id)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let loaded_settings = settings::load_settings().unwrap_or_default();
    let command_db = db::Db::new().expect("failed to initialize command database");

    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init());

    #[cfg(debug_assertions)]
    let builder = builder.plugin(tauri_plugin_mcp_bridge::init());

    builder
        .manage(AppState {
            pty_manager: Mutex::new(PtyManager::new()),
            settings: Mutex::new(loaded_settings),
            command_db,
        })
        .invoke_handler(tauri::generate_handler![
            create_pty,
            write_pty,
            resize_pty,
            kill_pty,
            read_dir,
            create_file,
            create_dir,
            write_text_file,
            rename_entry,
            move_entries,
            delete_entries,
            get_home_dir,
            list_drives,
            get_os_platform,
            read_file_preview,
            get_settings,
            save_settings,
            save_terminal_state,
            load_terminal_state,
            save_workspace_state,
            load_workspace_state,
            load_command_history,
            save_command_history,
            record_command_history,
            load_command_mappings,
            save_command_mappings,
            load_ssh_profiles,
            save_ssh_profiles,
            test_ssh_connection,
            get_remote_home,
            read_remote_dir,
            download_remote_entries,
            upload_local_entries,
            load_shortcuts,
            save_shortcuts,
            load_default_shortcuts,
            get_platform,
            get_platforms,
            list_command_libraries,
            create_command_library,
            update_command_library,
            delete_command_library,
            query_command_summaries,
            search_command_summaries,
            get_command_detail,
            create_command,
            update_command,
            delete_command_entry,
            import_command_library,
            export_command_library,
            reset_builtin_library,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
