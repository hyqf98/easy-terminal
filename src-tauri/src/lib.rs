//! Easy Terminal - A lightweight cross-platform smart terminal manager

pub mod commands;
pub mod config;
pub mod docker;
pub mod error;
pub mod fs;
pub mod pty;
pub mod response;
pub mod ssh;
pub mod utils;

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use commands::{
    create_terminal, close_terminal, terminal_input, resize_terminal,
    get_available_shells, get_default_shell, get_terminal_cwd, get_terminal_sessions,
    list_directory, get_file_info, create_directory, create_file,
    delete_path, rename_path, copy_path, move_path, read_file, write_file,
    path_exists, get_home_directory, get_default_directory,
    watch_directory, unwatch_directory, search_files, get_file_icon,
    get_settings, save_settings, reset_settings,
    get_window_state, save_window_state, get_app_version, get_platform_info,
    init_terminal_state,
    // SSH commands
    test_ssh_connection, connect_ssh, disconnect_ssh, ssh_input, resize_ssh,
    save_ssh_config, delete_ssh_config, get_ssh_configs, get_ssh_config,
    get_ssh_session_status, get_ssh_sessions,
    // Docker commands
    connect_docker, is_docker_connected, list_docker_containers, list_docker_images,
    start_docker_container, stop_docker_container, restart_docker_container,
    get_docker_container, create_docker_exec, docker_exec_input, resize_docker_exec,
    disconnect_docker_exec, get_docker_exec_status, get_docker_exec_sessions, disconnect_docker,
    // History commands
    add_command_history, search_command_history, get_recent_commands,
    get_unique_commands, get_commands_by_session, get_commands_by_cwd,
    clear_command_history, set_max_history_entries, get_history_stats,
};
use ssh::ssh_manager;
use docker::docker_manager;

/// Initialize logging
fn init_logging() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,easy_terminal=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    init_logging();

    tracing::info!("Starting Easy Terminal...");

    tauri::Builder::default()
        // Tauri plugins
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard::init())
        // .plugin(tauri_plugin_updater::Builder::new().build()) // Temporarily disabled
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_mcp_bridge::init())
        // Initialize terminal state with app handle
        .setup(|app| {
            init_terminal_state(app.handle().clone());
            // Initialize SSH manager with app handle
            ssh_manager().set_app_handle(app.handle().clone());
            // Load SSH configs
            let _ = ssh_manager().load_configs();
            // Initialize Docker manager with app handle
            docker_manager().set_app_handle(app.handle().clone());
            Ok(())
        })
        // Register all commands
        .invoke_handler(tauri::generate_handler![
            // Terminal commands
            create_terminal,
            close_terminal,
            terminal_input,
            resize_terminal,
            get_available_shells,
            get_default_shell,
            get_terminal_cwd,
            get_terminal_sessions,
            // File system commands
            list_directory,
            get_file_info,
            create_directory,
            create_file,
            delete_path,
            rename_path,
            copy_path,
            move_path,
            read_file,
            write_file,
            path_exists,
            get_home_directory,
            get_default_directory,
            watch_directory,
            unwatch_directory,
            search_files,
            get_file_icon,
            // Config commands
            get_settings,
            save_settings,
            reset_settings,
            get_window_state,
            save_window_state,
            get_app_version,
            get_platform_info,
            // SSH commands
            test_ssh_connection,
            connect_ssh,
            disconnect_ssh,
            ssh_input,
            resize_ssh,
            save_ssh_config,
            delete_ssh_config,
            get_ssh_configs,
            get_ssh_config,
            get_ssh_session_status,
            get_ssh_sessions,
            // Docker commands
            connect_docker,
            is_docker_connected,
            list_docker_containers,
            list_docker_images,
            start_docker_container,
            stop_docker_container,
            restart_docker_container,
            get_docker_container,
            create_docker_exec,
            docker_exec_input,
            resize_docker_exec,
            disconnect_docker_exec,
            get_docker_exec_status,
            get_docker_exec_sessions,
            disconnect_docker,
            // History commands
            add_command_history,
            search_command_history,
            get_recent_commands,
            get_unique_commands,
            get_commands_by_session,
            get_commands_by_cwd,
            clear_command_history,
            set_max_history_entries,
            get_history_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
