//! File system-related Tauri commands

use serde::{Deserialize, Serialize};
use std::path::Path;
use tracing::info;

#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;

use crate::error::AppError;
use crate::response::ApiResponse;
use fs2;

/// Drive information for multi-root support
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriveInfo {
    pub name: String,
    pub path: String,
    pub total_space: u64,
    pub available_space: u64,
    pub is_removable: bool,
    pub drive_type: String,
}

/// List available drives (Windows) or root path (Unix)
#[tauri::command]
pub async fn list_drives() -> ApiResponse<Vec<DriveInfo>> {
    info!("Listing available drives");

    let drives = get_available_drives();
    ApiResponse::success(drives)
}

/// Get available drives based on platform
fn get_available_drives() -> Vec<DriveInfo> {
    #[cfg(windows)]
    {
        get_windows_drives()
    }

    #[cfg(not(windows))]
    {
        get_unix_root()
    }
}

/// Get volume label on Windows using Windows API
#[cfg(windows)]
fn get_volume_label(drive: &str) -> Option<String> {
    use std::ffi::OsString;
    use std::os::windows::ffi::OsStringExt;
    use winapi::um::fileapi::GetVolumeInformationW;

    let wide_path: Vec<u16> = OsString::from(format!("{}\\", drive))
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let mut volume_name_buffer = [0u16; 256];
    let mut filesystem_name_buffer = [0u16; 256];

    let result = unsafe {
        GetVolumeInformationW(
            wide_path.as_ptr(),
            volume_name_buffer.as_mut_ptr(),
            volume_name_buffer.len() as u32,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            filesystem_name_buffer.as_mut_ptr(),
            filesystem_name_buffer.len() as u32,
        )
    };

    if result != 0 {
        let len = volume_name_buffer.iter().position(|&c| c == 0).unwrap_or(0);
        if len > 0 {
            let label = OsString::from_wide(&volume_name_buffer[..len])
                .to_string_lossy()
                .to_string();
            return Some(label);
        }
    }
    None
}

/// Check if drive is removable on Windows using Windows API
#[cfg(windows)]
fn is_removable_drive(drive: &str) -> bool {
    use std::ffi::OsString;
    use winapi::um::fileapi::GetDriveTypeW;

    let wide_path: Vec<u16> = OsString::from(format!("{}\\", drive))
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let drive_type = unsafe { GetDriveTypeW(wide_path.as_ptr()) };

    // DRIVE_REMOVABLE = 2, DRIVE_CDROM = 5, DRIVE_RAMDISK = 6
    matches!(drive_type, 2 | 5 | 6)
}

#[cfg(windows)]
fn get_windows_drives() -> Vec<DriveInfo> {
    let mut drives = Vec::new();

    // Simple approach: try common drive letters
    for letter in b'C'..=b'Z' {
        let drive = format!("{}:\\", letter as char);
        if std::path::Path::new(&drive).exists() {
            if let Some(info) = create_drive_info(&drive) {
                drives.push(info);
            }
        }
    }

    drives
}

#[cfg(windows)]
fn create_drive_info(drive: &str) -> Option<DriveInfo> {
    let path = std::path::Path::new(drive);
    if !path.exists() {
        return None;
    }

    // Get disk space info using fs2 crate
    let available_space = fs2::available_space(path).unwrap_or(0);
    let total_space = fs2::total_space(path).unwrap_or(0);

    // Use Windows API to accurately determine if drive is removable
    let is_removable = is_removable_drive(drive);

    // Get the real volume label using Windows API
    let volume_label = get_volume_label(drive);

    // Create a friendly name with volume label
    let drive_letter = drive.trim_end_matches('\\');
    let name = if let Some(label) = volume_label {
        if !label.is_empty() {
            format!("{} ({})", label, drive_letter)
        } else {
            format!("本地磁盘 ({})", drive_letter)
        }
    } else {
        format!("本地磁盘 ({})", drive_letter)
    };

    // Determine drive type string
    let drive_type = if is_removable {
        "removable"
    } else {
        "fixed"
    };

    Some(DriveInfo {
        name,
        path: drive.to_string(),
        total_space,
        available_space,
        is_removable,
        drive_type: drive_type.to_string(),
    })
}

#[cfg(not(windows))]
fn get_unix_root() -> Vec<DriveInfo> {
    let mut drives = Vec::new();

    // Add root path
    if let Ok(metadata) = std::fs::metadata("/") {
        let total_space = metadata.is_dir().then(|| {
            fs2::available_space(std::path::Path::new("/")).ok().unwrap_or(0)
        }).unwrap_or(0);

        drives.push(DriveInfo {
            name: "Root (/)".to_string(),
            path: "/".to_string(),
            total_space,
            available_space: total_space, // Simplified
            is_removable: false,
            drive_type: "root".to_string(),
        });
    }

    // On macOS, also add /Volumes
    #[cfg(target_os = "macos")]
    {
        if let Ok(entries) = std::fs::read_dir("/Volumes") {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let name = path.file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();

                    drives.push(DriveInfo {
                        name: format!("{} (/Volumes/{})", name, name),
                        path: path.to_string_lossy().to_string(),
                        total_space: 0,
                        available_space: 0,
                        is_removable: true,
                        drive_type: "volume".to_string(),
                    });
                }
            }
        }
    }

    // On Linux, check for common mount points
    #[cfg(target_os = "linux")]
    {
        let mount_points = ["/mnt", "/media"];
        for mount_base in mount_points {
            if let Ok(entries) = std::fs::read_dir(mount_base) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        let name = path.file_name()
                            .map(|n| n.to_string_lossy().to_string())
                            .unwrap_or_default();

                        drives.push(DriveInfo {
                            name: format!("{} ({}/{})", name, mount_base, name),
                            path: path.to_string_lossy().to_string(),
                            total_space: 0,
                            available_space: 0,
                            is_removable: true,
                            drive_type: "mount".to_string(),
                        });
                    }
                }
            }
        }
    }

    drives
}

/// File type enumeration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileType {
    File,
    Directory,
    Symlink,
    Unknown,
}

/// File item for API responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileItem {
    pub path: String,
    pub name: String,
    #[serde(rename = "type")]
    pub file_type: FileType,
    pub size: u64,
    pub modified_at: i64,
    pub created_at: Option<i64>,
    pub is_hidden: bool,
    pub is_read_only: bool,
    pub extension: Option<String>,
    pub icon_type: Option<String>,
}

/// Directory listing options
#[derive(Debug, Deserialize)]
pub struct DirectoryListOptions {
    pub show_hidden: Option<bool>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
    pub filter: Option<String>,
}

/// File operation result
#[derive(Debug, Serialize)]
pub struct FileOperationResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// List directory contents
#[tauri::command]
pub async fn list_directory(
    path: String,
    options: Option<DirectoryListOptions>,
) -> ApiResponse<Vec<FileItem>> {
    info!("Listing directory: {} with options: {:?}", path, options);

    let dir_path = Path::new(&path);
    if !dir_path.exists() {
        return ApiResponse::from(Err(AppError::FileSystem(format!(
            "Directory does not exist: {}",
            path
        ))));
    }

    if !dir_path.is_dir() {
        return ApiResponse::from(Err(AppError::FileSystem(format!(
            "Path is not a directory: {}",
            path
        ))));
    }

    let show_hidden = options.as_ref().and_then(|o| o.show_hidden).unwrap_or(false);

    let mut files: Vec<FileItem> = Vec::new();

    let entries = match std::fs::read_dir(dir_path) {
        Ok(entries) => entries,
        Err(e) => {
            return ApiResponse::from(Err(AppError::FileSystem(format!(
                "Failed to read directory: {}",
                e
            ))))
        }
    };

    for entry in entries.flatten() {
        let entry_path = entry.path();
        let name = entry_path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        // Skip hidden files unless show_hidden is true
        if name.starts_with('.') && !show_hidden {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let file_type = if metadata.is_dir() {
            FileType::Directory
        } else if metadata.is_symlink() {
            FileType::Symlink
        } else if metadata.is_file() {
            FileType::File
        } else {
            FileType::Unknown
        };

        let extension = entry_path
            .extension()
            .map(|e| e.to_string_lossy().to_string());

        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);

        let created_at = metadata
            .created()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64);

        let is_hidden = name.starts_with('.');
        let is_read_only = metadata.permissions().readonly();

        files.push(FileItem {
            path: entry_path.to_string_lossy().to_string(),
            name,
            file_type,
            size: metadata.len(),
            modified_at,
            created_at,
            is_hidden,
            is_read_only,
            extension,
            icon_type: None,
        });
    }

    // Sort by name by default
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    ApiResponse::success(files)
}

/// Get file info
#[tauri::command]
pub async fn get_file_info(path: String) -> ApiResponse<FileItem> {
    info!("Getting file info: {}", path);

    let file_path = Path::new(&path);
    if !file_path.exists() {
        return ApiResponse::from(Err(AppError::FileSystem(format!(
            "File does not exist: {}",
            path
        ))));
    }

    let metadata = match std::fs::metadata(file_path) {
        Ok(m) => m,
        Err(e) => {
            return ApiResponse::from(Err(AppError::FileSystem(format!(
                "Failed to get file metadata: {}",
                e
            ))))
        }
    };

    let name = file_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let file_type = if metadata.is_dir() {
        FileType::Directory
    } else if metadata.is_symlink() {
        FileType::Symlink
    } else {
        FileType::File
    };

    let extension = file_path
        .extension()
        .map(|e| e.to_string_lossy().to_string());

    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);

    let created_at = metadata
        .created()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64);

    ApiResponse::success(FileItem {
        path: path.clone(),
        name,
        file_type,
        size: metadata.len(),
        modified_at,
        created_at,
        is_hidden: path.contains("/."),
        is_read_only: metadata.permissions().readonly(),
        extension,
        icon_type: None,
    })
}

/// Create directory
#[tauri::command]
pub async fn create_directory(path: String) -> ApiResponse<FileOperationResult> {
    info!("Creating directory: {}", path);

    match std::fs::create_dir_all(&path) {
        Ok(_) => ApiResponse::success(FileOperationResult {
            success: true,
            error: None,
        }),
        Err(e) => ApiResponse::success(FileOperationResult {
            success: false,
            error: Some(e.to_string()),
        }),
    }
}

/// Create file
#[tauri::command]
pub async fn create_file(path: String) -> ApiResponse<FileOperationResult> {
    info!("Creating file: {}", path);

    match std::fs::File::create(&path) {
        Ok(_) => ApiResponse::success(FileOperationResult {
            success: true,
            error: None,
        }),
        Err(e) => ApiResponse::success(FileOperationResult {
            success: false,
            error: Some(e.to_string()),
        }),
    }
}

/// Delete file or directory
#[tauri::command]
pub async fn delete_path(path: String, use_trash: bool) -> ApiResponse<FileOperationResult> {
    info!("Deleting path: {} (use_trash: {})", path, use_trash);

    // For now, we'll do permanent delete
    // TODO: Implement trash support
    let _ = use_trash;

    let file_path = Path::new(&path);
    let result = if file_path.is_dir() {
        std::fs::remove_dir_all(file_path)
    } else {
        std::fs::remove_file(file_path)
    };

    match result {
        Ok(_) => ApiResponse::success(FileOperationResult {
            success: true,
            error: None,
        }),
        Err(e) => ApiResponse::success(FileOperationResult {
            success: false,
            error: Some(e.to_string()),
        }),
    }
}

/// Rename file or directory
#[tauri::command]
pub async fn rename_path(
    old_path: String,
    new_path: String,
) -> ApiResponse<FileOperationResult> {
    info!("Renaming: {} -> {}", old_path, new_path);

    match std::fs::rename(&old_path, &new_path) {
        Ok(_) => ApiResponse::success(FileOperationResult {
            success: true,
            error: None,
        }),
        Err(e) => ApiResponse::success(FileOperationResult {
            success: false,
            error: Some(e.to_string()),
        }),
    }
}

/// Copy file or directory
#[tauri::command]
pub async fn copy_path(
    source: String,
    destination: String,
    overwrite: bool,
) -> ApiResponse<FileOperationResult> {
    info!("Copying: {} -> {} (overwrite: {})", source, destination, overwrite);

    let src_path = Path::new(&source);
    let dest_path = Path::new(&destination);

    if dest_path.exists() && !overwrite {
        return ApiResponse::success(FileOperationResult {
            success: false,
            error: Some("Destination already exists".to_string()),
        });
    }

    let result = if src_path.is_dir() {
        // Copy directory recursively
        copy_dir_all(src_path, dest_path)
    } else {
        std::fs::copy(src_path, dest_path).map(|_| ())
    };

    match result {
        Ok(_) => ApiResponse::success(FileOperationResult {
            success: true,
            error: None,
        }),
        Err(e) => ApiResponse::success(FileOperationResult {
            success: false,
            error: Some(e.to_string()),
        }),
    }
}

/// Helper function to copy directory recursively
fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if ty.is_dir() {
            copy_dir_all(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

/// Move file or directory
#[tauri::command]
pub async fn move_path(
    source: String,
    destination: String,
    overwrite: bool,
) -> ApiResponse<FileOperationResult> {
    info!("Moving: {} -> {} (overwrite: {})", source, destination, overwrite);

    let dest_path = Path::new(&destination);

    if dest_path.exists() && !overwrite {
        return ApiResponse::success(FileOperationResult {
            success: false,
            error: Some("Destination already exists".to_string()),
        });
    }

    match std::fs::rename(&source, &destination) {
        Ok(_) => ApiResponse::success(FileOperationResult {
            success: true,
            error: None,
        }),
        Err(e) => ApiResponse::success(FileOperationResult {
            success: false,
            error: Some(e.to_string()),
        }),
    }
}

/// Read file content
#[tauri::command]
pub async fn read_file(path: String) -> ApiResponse<String> {
    info!("Reading file: {}", path);

    match std::fs::read_to_string(&path) {
        Ok(content) => ApiResponse::success(content),
        Err(e) => ApiResponse::from(Err(AppError::FileSystem(format!(
            "Failed to read file: {}",
            e
        )))),
    }
}

/// Write file content
#[tauri::command]
pub async fn write_file(path: String, content: String) -> ApiResponse<FileOperationResult> {
    info!("Writing file: {} ({} bytes)", path, content.len());

    match std::fs::write(&path, content) {
        Ok(_) => ApiResponse::success(FileOperationResult {
            success: true,
            error: None,
        }),
        Err(e) => ApiResponse::success(FileOperationResult {
            success: false,
            error: Some(e.to_string()),
        }),
    }
}

/// Check if path exists
#[tauri::command]
pub async fn path_exists(path: String) -> ApiResponse<bool> {
    ApiResponse::success(Path::new(&path).exists())
}

/// Get home directory
#[tauri::command]
pub async fn get_home_directory() -> ApiResponse<String> {
    let home = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "/".to_string());
    ApiResponse::success(home)
}

/// Get default directory for terminal
#[tauri::command]
pub async fn get_default_directory() -> ApiResponse<String> {
    let dir = std::env::current_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| {
            dirs::home_dir()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|| "/".to_string())
        });
    ApiResponse::success(dir)
}

/// Search for files by name pattern
#[tauri::command]
pub async fn search_files(
    base_path: String,
    pattern: String,
    options: Option<DirectoryListOptions>,
) -> ApiResponse<Vec<FileItem>> {
    info!("Searching files in: {} with pattern: {}", base_path, pattern);

    let search_path = Path::new(&base_path);
    if !search_path.exists() {
        return ApiResponse::from(Err(AppError::FileSystem(format!(
            "Directory does not exist: {}",
            base_path
        ))));
    }

    let show_hidden = options.as_ref().and_then(|o| o.show_hidden).unwrap_or(false);
    let case_sensitive = false; // Default to case-insensitive
    let pattern_lower = pattern.to_lowercase();
    let max_results: usize = 100; // Limit results

    let mut results: Vec<FileItem> = Vec::new();

    // Use walkdir for recursive search
    let walker = walkdir::WalkDir::new(search_path)
        .follow_links(false)
        .into_iter()
        .filter_entry(|e| {
            // Filter hidden files
            if !show_hidden {
                let name = e.file_name().to_string_lossy();
                if name.starts_with('.') {
                    return false;
                }
            }
            true
        });

    for entry in walker.flatten() {
        if results.len() >= max_results {
            break;
        }

        let name = entry.file_name().to_string_lossy();
        let matches = if case_sensitive {
            name.contains(&pattern)
        } else {
            name.to_lowercase().contains(&pattern_lower)
        };

        if !matches {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let file_type = if metadata.is_dir() {
            FileType::Directory
        } else if metadata.is_symlink() {
            FileType::Symlink
        } else if metadata.is_file() {
            FileType::File
        } else {
            FileType::Unknown
        };

        let extension = entry
            .path()
            .extension()
            .map(|e| e.to_string_lossy().to_string());

        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64)
            .unwrap_or(0);

        let created_at = metadata
            .created()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as i64);

        results.push(FileItem {
            path: entry.path().to_string_lossy().to_string(),
            name: name.to_string(),
            file_type,
            size: metadata.len(),
            modified_at,
            created_at,
            is_hidden: name.starts_with('.'),
            is_read_only: metadata.permissions().readonly(),
            extension,
            icon_type: None,
        });
    }

    // Sort results by relevance (exact match first, then by name)
    results.sort_by(|a, b| {
        let a_exact = a.name.to_lowercase() == pattern_lower;
        let b_exact = b.name.to_lowercase() == pattern_lower;
        if a_exact && !b_exact {
            std::cmp::Ordering::Less
        } else if !a_exact && b_exact {
            std::cmp::Ordering::Greater
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    ApiResponse::success(results)
}

/// Get icon type for a file based on its extension/name
#[tauri::command]
pub async fn get_file_icon(path: String, is_dir: bool) -> ApiResponse<String> {
    let icon_type = if is_dir {
        // Directory icon based on name
        let name = Path::new(&path)
            .file_name()
            .map(|n| n.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        let folder_icon = match name.as_str() {
            "node_modules" => "folder-node",
            "src" | "source" | "sources" => "folder-src",
            "dist" | "build" | "out" | "target" => "folder-dist",
            "test" | "tests" | "__tests__" | "spec" => "folder-test",
            "docs" | "documentation" => "folder-docs",
            "config" | "configs" | ".config" => "folder-config",
            "assets" | "resources" | "static" | "public" => "folder-resource",
            "images" | "img" | "icons" => "folder-images",
            "components" => "folder-components",
            "lib" | "library" | "libraries" => "folder-lib",
            "scripts" => "folder-scripts",
            "styles" | "css" | "scss" | "sass" => "folder-styles",
            "types" | "@types" | "typings" => "folder-type",
            "views" | "pages" => "folder-views",
            "utils" | "utilities" | "helpers" => "folder-utils",
            "hooks" => "folder-hook",
            "stores" | "store" => "folder-database",
            "models" => "folder-model",
            "services" => "folder-service",
            "layouts" => "folder-layout",
            "routes" | "router" => "folder-routing",
            ".git" | ".github" => "folder-git",
            ".vscode" => "folder-vscode",
            "vendor" => "folder-lib",
            "bin" => "folder-bin",
            "logs" => "folder-logs",
            "temp" | "tmp" => "folder-temp",
            _ => "folder",
        };
        folder_icon.to_string()
    } else {
        // File icon based on extension
        let path_obj = Path::new(&path);
        let extension = path_obj
            .extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        let name = path_obj
            .file_name()
            .map(|n| n.to_string_lossy().to_lowercase())
            .unwrap_or_default();

        // Check special filenames first
        let file_icon = match name.as_str() {
            "package.json" => "nodejs",
            "package-lock.json" => "nodejs",
            "yarn.lock" => "yarn",
            "pnpm-lock.yaml" => "pnpm",
            "tsconfig.json" => "typescript",
            "jsconfig.json" => "javascript",
            ".gitignore" | ".gitattributes" => "git",
            ".env" | ".env.local" | ".env.development" | ".env.production" => "tune",
            ".eslintrc" | ".eslintrc.js" | ".eslintrc.json" | ".eslintrc.yaml" => "eslint",
            ".prettierrc" | ".prettierrc.js" | ".prettierrc.json" => "prettier",
            "dockerfile" | "dockerfile.prod" => "docker",
            "docker-compose.yml" | "docker-compose.yaml" => "docker",
            "makefile" => "makefile",
            "readme.md" | "readme" => "readme",
            "license" | "license.md" | "license.txt" => "certificate",
            "changelog.md" | "changelog" => "changelog",
            ".npmrc" => "npm",
            ".nvmrc" => "nodejs",
            "cargo.toml" => "rust",
            "cargo.lock" => "rust",
            "go.mod" | "go.sum" => "go",
            "pom.xml" => "java",
            "build.gradle" | "build.gradle.kts" => "gradle",
            "vue.config.js" | "vue.config.ts" => "vue",
            "vite.config.js" | "vite.config.ts" => "vite",
            "webpack.config.js" | "webpack.config.ts" => "webpack",
            "rollup.config.js" | "rollup.config.ts" => "rollup",
            _ => {
                // Fall back to extension-based icons
                match extension.as_str() {
                    // JavaScript/TypeScript
                    "js" | "mjs" | "cjs" => "javascript",
                    "ts" | "mts" | "cts" => "typescript",
                    "jsx" | "tsx" => "react",
                    "vue" => "vue",
                    "svelte" => "svelte",
                    "angular" => "angular",

                    // Styles
                    "css" => "css",
                    "scss" | "sass" => "sass",
                    "less" => "less",
                    "styl" | "stylus" => "stylus",

                    // Data formats
                    "json" => "json",
                    "xml" => "xml",
                    "yaml" | "yml" => "yaml",
                    "toml" => "toml",
                    "ini" => "settings",
                    "conf" | "config" => "settings",

                    // Markup
                    "html" | "htm" => "html",
                    "md" | "markdown" => "markdown",
                    "rst" => "text",

                    // Programming languages
                    "py" => "python",
                    "rb" => "ruby",
                    "go" => "go",
                    "rs" => "rust",
                    "java" => "java",
                    "kt" | "kts" => "kotlin",
                    "scala" | "sc" => "scala",
                    "swift" => "swift",
                    "c" => "c",
                    "cpp" | "cc" | "cxx" => "cpp",
                    "h" | "hpp" => "h",
                    "cs" => "csharp",
                    "php" => "php",
                    "lua" => "lua",
                    "r" => "r",
                    "dart" => "dart",
                    "ex" | "exs" => "elixir",
                    "erl" => "erlang",
                    "clj" | "cljs" => "clojure",
                    "hs" => "haskell",
                    "sql" => "database",
                    "sh" | "bash" | "zsh" => "console",
                    "ps1" | "psm1" => "powershell",
                    "bat" | "cmd" => "console",
                    "fish" => "fish",

                    // Shell configs
                    "zshrc" | "bashrc" | "bash_profile" | "profile" => "console",

                    // Images
                    "png" | "jpg" | "jpeg" | "gif" | "svg" | "webp" | "ico" | "bmp" => "image",
                    "avif" | "heic" | "heif" => "image",

                    // Audio
                    "mp3" | "wav" | "ogg" | "flac" | "aac" | "m4a" => "audio",

                    // Video
                    "mp4" | "webm" | "avi" | "mov" | "mkv" | "wmv" => "video",

                    // Documents
                    "pdf" => "pdf",
                    "doc" | "docx" => "word",
                    "xls" | "xlsx" => "excel",
                    "ppt" | "pptx" => "powerpoint",

                    // Archives
                    "zip" | "tar" | "gz" | "rar" | "7z" | "bz2" | "xz" => "zip",

                    // Fonts
                    "ttf" | "otf" | "woff" | "woff2" | "eot" => "font",

                    // Binary/Other
                    "exe" | "msi" | "app" | "dmg" | "deb" | "rpm" => "executable",
                    "dll" | "so" | "dylib" => "binary",
                    "bin" => "binary",
                    "lock" => "lock",
                    "log" => "log",
                    "map" => "map",

                    // Default
                    _ => "file",
                }
            }
        };
        file_icon.to_string()
    };

    ApiResponse::success(icon_type)
}

/// Watch directory for changes (placeholder)
#[tauri::command]
pub async fn watch_directory(path: String) -> ApiResponse<()> {
    info!("Starting to watch directory: {}", path);
    // TODO: Implement file watching with notify crate
    ApiResponse::<()>::ok()
}

/// Stop watching directory (placeholder)
#[tauri::command]
pub async fn unwatch_directory(path: String) -> ApiResponse<()> {
    info!("Stopping watch on directory: {}", path);
    // TODO: Implement file watching with notify crate
    ApiResponse::<()>::ok()
}
