//! File system-related Tauri commands

use serde::{Deserialize, Serialize};
use std::path::Path;
use tracing::info;

use crate::error::AppError;
use crate::response::ApiResponse;

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
