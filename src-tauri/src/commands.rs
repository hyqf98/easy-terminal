use std::fs;

pub fn get_platform() -> String {
    if cfg!(windows) {
        "windows".to_string()
    } else if cfg!(target_os = "macos") {
        "darwin".to_string()
    } else {
        "linux".to_string()
    }
}

pub fn get_platforms() -> Vec<String> {
    let mut platforms = vec![get_platform()];
    if cfg!(target_os = "linux") {
        if let Ok(content) = fs::read_to_string("/etc/os-release") {
            if content.contains("Ubuntu") || content.contains("ubuntu") {
                platforms.push("ubuntu".to_string());
            }
            if content.contains("Arch") || content.contains("arch") {
                platforms.push("arch".to_string());
            }
        }
    }
    platforms
}
