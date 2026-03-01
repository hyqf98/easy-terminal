//! File icon mapping utilities

use std::collections::HashMap;
use std::sync::OnceLock;

/// Get the icon type for a file based on its extension
pub fn get_icon_type(extension: &str, is_dir: bool) -> String {
    if is_dir {
        return "folder".to_string();
    }

    let icons = get_icon_map();
    icons
        .get(extension.to_lowercase().as_str())
        .cloned()
        .unwrap_or_else(|| "file".to_string())
}

/// Get the icon map
fn get_icon_map() -> &'static HashMap<&'static str, String> {
    static ICON_MAP: OnceLock<HashMap<&'static str, String>> = OnceLock::new();
    ICON_MAP.get_or_init(|| {
        let mut map = HashMap::new();

        // Programming languages
        map.insert("ts", "typescript".to_string());
        map.insert("tsx", "typescript-react".to_string());
        map.insert("js", "javascript".to_string());
        map.insert("jsx", "javascript-react".to_string());
        map.insert("vue", "vue".to_string());
        map.insert("svelte", "svelte".to_string());
        map.insert("rs", "rust".to_string());
        map.insert("py", "python".to_string());
        map.insert("go", "go".to_string());
        map.insert("java", "java".to_string());
        map.insert("kt", "kotlin".to_string());
        map.insert("swift", "swift".to_string());
        map.insert("c", "c".to_string());
        map.insert("cpp", "cpp".to_string());
        map.insert("h", "header".to_string());
        map.insert("hpp", "header".to_string());
        map.insert("cs", "csharp".to_string());
        map.insert("rb", "ruby".to_string());
        map.insert("php", "php".to_string());
        map.insert("lua", "lua".to_string());
        map.insert("r", "r".to_string());
        map.insert("sh", "shell".to_string());
        map.insert("bash", "shell".to_string());
        map.insert("zsh", "shell".to_string());
        map.insert("ps1", "powershell".to_string());
        map.insert("bat", "batch".to_string());
        map.insert("cmd", "batch".to_string());

        // Config files
        map.insert("json", "json".to_string());
        map.insert("yaml", "yaml".to_string());
        map.insert("yml", "yaml".to_string());
        map.insert("toml", "toml".to_string());
        map.insert("xml", "xml".to_string());
        map.insert("ini", "ini".to_string());
        map.insert("env", "tune".to_string());

        // Web
        map.insert("html", "html".to_string());
        map.insert("htm", "html".to_string());
        map.insert("css", "css".to_string());
        map.insert("scss", "sass".to_string());
        map.insert("sass", "sass".to_string());
        map.insert("less", "less".to_string());

        // Data
        map.insert("md", "markdown".to_string());
        map.insert("markdown", "markdown".to_string());
        map.insert("csv", "csv".to_string());
        map.insert("sql", "database".to_string());

        // Images
        map.insert("png", "image".to_string());
        map.insert("jpg", "image".to_string());
        map.insert("jpeg", "image".to_string());
        map.insert("gif", "image".to_string());
        map.insert("svg", "svg".to_string());
        map.insert("ico", "image".to_string());
        map.insert("webp", "image".to_string());

        // Documents
        map.insert("pdf", "pdf".to_string());
        map.insert("doc", "word".to_string());
        map.insert("docx", "word".to_string());
        map.insert("xls", "excel".to_string());
        map.insert("xlsx", "excel".to_string());
        map.insert("ppt", "powerpoint".to_string());
        map.insert("pptx", "powerpoint".to_string());

        // Archives
        map.insert("zip", "zip".to_string());
        map.insert("tar", "zip".to_string());
        map.insert("gz", "zip".to_string());
        map.insert("rar", "zip".to_string());
        map.insert("7z", "zip".to_string());

        // Audio/Video
        map.insert("mp3", "audio".to_string());
        map.insert("wav", "audio".to_string());
        map.insert("mp4", "video".to_string());
        map.insert("mkv", "video".to_string());
        map.insert("avi", "video".to_string());

        // Fonts
        map.insert("ttf", "font".to_string());
        map.insert("otf", "font".to_string());
        map.insert("woff", "font".to_string());
        map.insert("woff2", "font".to_string());

        // Lock files
        map.insert("lock", "lock".to_string());

        map
    })
}
