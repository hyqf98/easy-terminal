use crate::{fs, settings};
use serde::Serialize;
use ssh2::{Session, Sftp};
use std::fs::{self as local_fs, File as LocalFile};
use std::io::{Read, Write};
use std::net::{TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileTransferProgress {
    pub direction: String,
    pub status: String,
    pub file_name: String,
    pub detail: String,
    pub transferred_bytes: u64,
    pub total_bytes: u64,
    pub progress_percent: u64,
}

pub fn test_connection(
    host: String,
    port: u16,
    user: String,
    auth_type: String,
    password: String,
    private_key_path: String,
    jump_profile_id: String,
    profiles: Vec<settings::SSHProfile>,
) -> Result<String, String> {
    if jump_profile_id.is_empty() {
        return test_direct_connection(
            host,
            port,
            user,
            auth_type,
            password,
            private_key_path,
        );
    }

    if auth_type == "password" {
        return Err("当前版本暂不支持带跳板链路的密码测试，请优先验证目标机直连或改用密钥认证".to_string());
    }

    test_via_system_ssh(
        host,
        port,
        user,
        auth_type,
        private_key_path,
        jump_profile_id,
        profiles,
    )
}

pub fn get_remote_home(
    profile: settings::SSHProfile,
    _profiles: Vec<settings::SSHProfile>,
) -> Result<String, String> {
    let session = connect_session(&profile)?;
    let mut channel = session
        .channel_session()
        .map_err(|e| format!("无法创建 SSH 通道: {}", e))?;
    channel
        .exec("printf %s \"$HOME\"")
        .map_err(|e| format!("无法获取远程 HOME: {}", e))?;
    let mut output = String::new();
    channel
        .read_to_string(&mut output)
        .map_err(|e| format!("无法读取远程 HOME: {}", e))?;
    let _ = channel.wait_close();
    let home = output.trim();
    if home.is_empty() {
        return Ok("/".to_string());
    }
    Ok(normalize_remote_path(home))
}

pub fn read_remote_dir(
    profile: settings::SSHProfile,
    path: String,
    _profiles: Vec<settings::SSHProfile>,
) -> Result<Vec<fs::FileEntry>, String> {
    let session = connect_session(&profile)?;
    let sftp = session.sftp().map_err(|e| format!("无法创建 SFTP 会话: {}", e))?;
    let target = normalize_remote_path(&path);
    let mut entries = Vec::new();

    for (entry_path, stat) in sftp
        .readdir(Path::new(&target))
        .map_err(|e| format!("读取远程目录失败: {}", e))?
    {
        let name = entry_path
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_string();
        if name.is_empty() || name == "." || name == ".." {
            continue;
        }
        let full_path = normalize_remote_path(&entry_path.to_string_lossy());
        entries.push(fs::FileEntry {
            name: name.clone(),
            path: full_path,
            is_dir: stat.is_dir(),
            size: stat.size.unwrap_or(0),
            modified: stat.mtime.unwrap_or(0),
            icon: remote_icon(&name, stat.is_dir()),
        });
    }

    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

pub fn download_remote_entries(
    app_handle: AppHandle,
    profile: settings::SSHProfile,
    remote_paths: Vec<String>,
    local_dir: String,
    _profiles: Vec<settings::SSHProfile>,
) -> Result<(), String> {
    if remote_paths.is_empty() {
        return Ok(());
    }

    let session = connect_session(&profile)?;
    let sftp = session.sftp().map_err(|e| format!("无法创建 SFTP 会话: {}", e))?;
    let destination = PathBuf::from(local_dir);
    local_fs::create_dir_all(&destination).map_err(|e| format!("无法创建本地目录: {}", e))?;

    let total_bytes = remote_paths
        .iter()
        .try_fold(0u64, |acc, path| collect_remote_size(&sftp, Path::new(path)).map(|size| acc + size))?;
    let mut transferred = 0u64;

    emit_transfer(
        &app_handle,
        progress_payload("download", "starting", remote_paths[0].clone(), "开始下载".to_string(), 0, total_bytes),
    );

    for remote_path in &remote_paths {
        let name = Path::new(remote_path)
            .file_name()
            .and_then(|value| value.to_str())
            .unwrap_or("remote-item");
        let local_target = destination.join(name);
        download_entry_recursive(&sftp, Path::new(remote_path), &local_target, &app_handle, total_bytes, &mut transferred)?;
    }

    emit_transfer(
        &app_handle,
        progress_payload(
            "download",
            "success",
            remote_paths[0].clone(),
            "下载完成".to_string(),
            transferred,
            total_bytes,
        ),
    );
    Ok(())
}

pub fn upload_local_entries(
    app_handle: AppHandle,
    profile: settings::SSHProfile,
    local_paths: Vec<String>,
    remote_dir: String,
    _profiles: Vec<settings::SSHProfile>,
) -> Result<(), String> {
    if local_paths.is_empty() {
        return Ok(());
    }

    let session = connect_session(&profile)?;
    let sftp = session.sftp().map_err(|e| format!("无法创建 SFTP 会话: {}", e))?;
    let remote_dir_path = PathBuf::from(normalize_remote_path(&remote_dir));
    ensure_remote_dir(&sftp, &remote_dir_path)?;

    let total_bytes = local_paths.iter().try_fold(0u64, |acc, local_path| {
        collect_local_size(Path::new(local_path)).map(|size| acc + size)
    })?;
    let mut transferred = 0u64;

    emit_transfer(
        &app_handle,
        progress_payload("upload", "starting", remote_dir.clone(), "开始上传".to_string(), 0, total_bytes),
    );

    for local_path in &local_paths {
        let local = PathBuf::from(local_path);
        let file_name = local
            .file_name()
            .ok_or("无效的本地路径")?
            .to_string_lossy()
            .to_string();
        let remote_target = remote_dir_path.join(file_name);
        upload_entry_recursive(&sftp, &local, &remote_target, &app_handle, total_bytes, &mut transferred)?;
    }

    emit_transfer(
        &app_handle,
        progress_payload(
            "upload",
            "success",
            remote_dir,
            "上传完成".to_string(),
            transferred,
            total_bytes,
        ),
    );
    Ok(())
}

fn test_direct_connection(
    host: String,
    port: u16,
    user: String,
    auth_type: String,
    password: String,
    private_key_path: String,
) -> Result<String, String> {
    let address = format!("{}:{}", host, port);
    let socket = address
        .to_socket_addrs()
        .map_err(|e| format!("无法解析主机地址: {}", e))?
        .next()
        .ok_or("无法解析主机地址")?;

    let tcp = TcpStream::connect_timeout(&socket, Duration::from_secs(6))
        .map_err(|e| format!("SSH 连接失败: {}", e))?;
    let _ = tcp.set_read_timeout(Some(Duration::from_secs(6)));
    let _ = tcp.set_write_timeout(Some(Duration::from_secs(6)));

    let mut session = Session::new().map_err(|e| format!("无法创建 SSH 会话: {}", e))?;
    session.set_tcp_stream(tcp);
    session.handshake().map_err(|e| format!("SSH 握手失败: {}", e))?;

    if auth_type == "key" {
        let key_path = expand_home(private_key_path)?;
        let passphrase = if password.trim().is_empty() {
            None
        } else {
            Some(password.as_str())
        };
        session
            .userauth_pubkey_file(&user, None, &key_path, passphrase)
            .map_err(|e| format!("密钥认证失败: {}", e))?;
    } else {
        if password.trim().is_empty() {
            return Err("密码认证需要填写密码".to_string());
        }
        session
            .userauth_password(&user, &password)
            .map_err(|e| format!("密码认证失败: {}", e))?;
    }

    if !session.authenticated() {
        return Err("SSH 认证失败".to_string());
    }

    let mut channel = session
        .channel_session()
        .map_err(|e| format!("无法创建 SSH 通道: {}", e))?;
    channel.exec("exit").map_err(|e| format!("远程命令执行失败: {}", e))?;
    let _ = channel.wait_close();

    Ok("连接成功".to_string())
}

fn test_via_system_ssh(
    host: String,
    port: u16,
    user: String,
    auth_type: String,
    private_key_path: String,
    jump_profile_id: String,
    profiles: Vec<settings::SSHProfile>,
) -> Result<String, String> {
    let lookup: std::collections::HashMap<String, &settings::SSHProfile> =
        profiles.iter().map(|p| (p.id.clone(), p)).collect();

    let mut jump_chain: Vec<String> = Vec::new();
    let mut visited = std::collections::HashSet::new();
    let mut current_id = jump_profile_id;

    while !current_id.is_empty() {
        if visited.contains(&current_id) {
            break;
        }
        visited.insert(current_id.clone());
        if let Some(jump) = lookup.get(&current_id) {
            jump_chain.push(format!("{}@{}:{}", jump.user, jump.host, jump.port));
            current_id = jump.jump_profile_id.clone();
        } else {
            break;
        }
    }

    let mut args: Vec<String> = vec![
        "-o".to_string(),
        "BatchMode=yes".to_string(),
        "-o".to_string(),
        "ConnectTimeout=5".to_string(),
        "-o".to_string(),
        "StrictHostKeyChecking=no".to_string(),
    ];

    if auth_type == "key" && !private_key_path.is_empty() {
        args.push("-i".to_string());
        args.push(expand_home(private_key_path)?.to_string_lossy().to_string());
    }

    if !jump_chain.is_empty() {
        args.push("-J".to_string());
        args.push(jump_chain.join(","));
    }

    args.push("-p".to_string());
    args.push(port.to_string());
    args.push(format!("{}@{}", user, host));
    args.push("exit".to_string());

    let output = Command::new("ssh")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to execute ssh: {}", e))?;

    if output.status.success() {
        Ok("连接成功".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(stderr.trim().to_string())
    }
}

fn connect_session(profile: &settings::SSHProfile) -> Result<Session, String> {
    if !profile.jump_profile_id.is_empty() {
        return Err("当前版本的远程文件管理暂不支持跳板机链路".to_string());
    }

    let address = format!("{}:{}", profile.host, profile.port);
    let socket = address
        .to_socket_addrs()
        .map_err(|e| format!("无法解析主机地址: {}", e))?
        .next()
        .ok_or("无法解析主机地址")?;

    let tcp = TcpStream::connect_timeout(&socket, Duration::from_secs(8))
        .map_err(|e| format!("SSH 连接失败: {}", e))?;
    let _ = tcp.set_read_timeout(Some(Duration::from_secs(15)));
    let _ = tcp.set_write_timeout(Some(Duration::from_secs(15)));

    let mut session = Session::new().map_err(|e| format!("无法创建 SSH 会话: {}", e))?;
    session.set_tcp_stream(tcp);
    session.handshake().map_err(|e| format!("SSH 握手失败: {}", e))?;

    if profile.auth_type == "key" {
        let key_path = expand_home(profile.private_key_path.clone())?;
        let passphrase = if profile.password.trim().is_empty() {
            None
        } else {
            Some(profile.password.as_str())
        };
        session
            .userauth_pubkey_file(&profile.user, None, &key_path, passphrase)
            .map_err(|e| format!("密钥认证失败: {}", e))?;
    } else {
        if profile.password.trim().is_empty() {
            return Err("密码认证需要填写密码".to_string());
        }
        session
            .userauth_password(&profile.user, &profile.password)
            .map_err(|e| format!("密码认证失败: {}", e))?;
    }

    if !session.authenticated() {
        return Err("SSH 认证失败".to_string());
    }

    Ok(session)
}

fn collect_remote_size(sftp: &Sftp, remote_path: &Path) -> Result<u64, String> {
    let stat = sftp.stat(remote_path).map_err(|e| format!("读取远程文件信息失败: {}", e))?;
    if stat.is_dir() {
        let mut total = 0u64;
        for (child_path, child_stat) in sftp
            .readdir(remote_path)
            .map_err(|e| format!("读取远程目录失败: {}", e))?
        {
            let name = child_path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("");
            if name == "." || name == ".." {
                continue;
            }
            if child_stat.is_dir() {
                total += collect_remote_size(sftp, &child_path)?;
            } else {
                total += child_stat.size.unwrap_or(0);
            }
        }
        Ok(total)
    } else {
        Ok(stat.size.unwrap_or(0))
    }
}

fn collect_local_size(path: &Path) -> Result<u64, String> {
    let metadata = local_fs::metadata(path).map_err(|e| format!("读取本地文件信息失败: {}", e))?;
    if metadata.is_dir() {
        let mut total = 0u64;
        for entry in local_fs::read_dir(path).map_err(|e| format!("读取本地目录失败: {}", e))? {
            let entry = entry.map_err(|e| format!("读取本地目录失败: {}", e))?;
            total += collect_local_size(&entry.path())?;
        }
        Ok(total)
    } else {
        Ok(metadata.len())
    }
}

fn download_entry_recursive(
    sftp: &Sftp,
    remote_path: &Path,
    local_target: &Path,
    app_handle: &AppHandle,
    total_bytes: u64,
    transferred: &mut u64,
) -> Result<(), String> {
    let stat = sftp.stat(remote_path).map_err(|e| format!("读取远程文件信息失败: {}", e))?;
    if stat.is_dir() {
        local_fs::create_dir_all(local_target).map_err(|e| format!("创建本地目录失败: {}", e))?;
        for (child_path, _) in sftp
            .readdir(remote_path)
            .map_err(|e| format!("读取远程目录失败: {}", e))?
        {
            let name = child_path
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("");
            if name == "." || name == ".." {
                continue;
            }
            download_entry_recursive(
                sftp,
                &child_path,
                &local_target.join(name),
                app_handle,
                total_bytes,
                transferred,
            )?;
        }
        return Ok(());
    }

    if let Some(parent) = local_target.parent() {
        local_fs::create_dir_all(parent).map_err(|e| format!("创建本地目录失败: {}", e))?;
    }
    let mut remote_file = sftp.open(remote_path).map_err(|e| format!("打开远程文件失败: {}", e))?;
    let mut local_file = LocalFile::create(local_target).map_err(|e| format!("创建本地文件失败: {}", e))?;
    copy_with_progress(
        &mut remote_file,
        &mut local_file,
        app_handle,
        "download",
        &remote_path.to_string_lossy(),
        total_bytes,
        transferred,
    )
}

fn upload_entry_recursive(
    sftp: &Sftp,
    local_path: &Path,
    remote_target: &Path,
    app_handle: &AppHandle,
    total_bytes: u64,
    transferred: &mut u64,
) -> Result<(), String> {
    let metadata = local_fs::metadata(local_path).map_err(|e| format!("读取本地文件信息失败: {}", e))?;
    if metadata.is_dir() {
        ensure_remote_dir(sftp, remote_target)?;
        for entry in local_fs::read_dir(local_path).map_err(|e| format!("读取本地目录失败: {}", e))? {
            let entry = entry.map_err(|e| format!("读取本地目录失败: {}", e))?;
            upload_entry_recursive(
                sftp,
                &entry.path(),
                &remote_target.join(entry.file_name()),
                app_handle,
                total_bytes,
                transferred,
            )?;
        }
        return Ok(());
    }

    if let Some(parent) = remote_target.parent() {
        ensure_remote_dir(sftp, parent)?;
    }
    let mut local_file = LocalFile::open(local_path).map_err(|e| format!("打开本地文件失败: {}", e))?;
    let mut remote_file = sftp.create(remote_target).map_err(|e| format!("创建远程文件失败: {}", e))?;
    copy_with_progress(
        &mut local_file,
        &mut remote_file,
        app_handle,
        "upload",
        &local_path.to_string_lossy(),
        total_bytes,
        transferred,
    )
}

fn copy_with_progress<R: Read, W: Write>(
    reader: &mut R,
    writer: &mut W,
    app_handle: &AppHandle,
    direction: &str,
    file_name: &str,
    total_bytes: u64,
    transferred: &mut u64,
) -> Result<(), String> {
    let mut buffer = [0u8; 64 * 1024];
    loop {
        let read = reader.read(&mut buffer).map_err(|e| format!("传输失败: {}", e))?;
        if read == 0 {
            break;
        }
        writer
            .write_all(&buffer[..read])
            .map_err(|e| format!("写入失败: {}", e))?;
        *transferred += read as u64;
        emit_transfer(
            app_handle,
            progress_payload(
                direction,
                "progress",
                file_name.to_string(),
                if direction == "upload" { "上传中" } else { "下载中" }.to_string(),
                *transferred,
                total_bytes,
            ),
        );
    }
    writer.flush().map_err(|e| format!("刷新写入失败: {}", e))?;
    Ok(())
}

fn ensure_remote_dir(sftp: &Sftp, remote_path: &Path) -> Result<(), String> {
    let path_string = normalize_remote_path(&remote_path.to_string_lossy());
    let mut current = String::new();
    for segment in path_string.split('/').filter(|segment| !segment.is_empty()) {
        current.push('/');
        current.push_str(segment);
        let path = Path::new(&current);
        match sftp.stat(path) {
            Ok(stat) if stat.is_dir() => {}
            Ok(_) => return Err(format!("远程路径不是目录: {}", current)),
            Err(_) => {
                sftp.mkdir(path, 0o755)
                    .map_err(|e| format!("创建远程目录失败: {}", e))?;
            }
        }
    }
    if path_string == "/" {
        return Ok(());
    }
    Ok(())
}

fn progress_payload(
    direction: &str,
    status: &str,
    file_name: String,
    detail: String,
    transferred_bytes: u64,
    total_bytes: u64,
) -> FileTransferProgress {
    let progress_percent = if total_bytes == 0 {
        if status == "success" { 100 } else { 0 }
    } else {
        ((transferred_bytes as f64 / total_bytes as f64) * 100.0).round() as u64
    };
    FileTransferProgress {
        direction: direction.to_string(),
        status: status.to_string(),
        file_name,
        detail,
        transferred_bytes,
        total_bytes,
        progress_percent: progress_percent.min(100),
    }
}

fn emit_transfer(app_handle: &AppHandle, payload: FileTransferProgress) {
    let _ = app_handle.emit("file-transfer-progress", payload);
}

fn expand_home(path: String) -> Result<PathBuf, String> {
    if path.trim().is_empty() {
        return Err("密钥路径不能为空".to_string());
    }

    if let Some(stripped) = path.strip_prefix("~/") {
        let home = dirs::home_dir().ok_or("无法确定用户目录")?;
        return Ok(home.join(stripped));
    }

    Ok(PathBuf::from(path))
}

fn normalize_remote_path(path: &str) -> String {
    let normalized = path.replace('\\', "/");
    if normalized.is_empty() {
        "/".to_string()
    } else if normalized.starts_with('/') {
        normalized
    } else {
        format!("/{}", normalized)
    }
}

fn remote_icon(name: &str, is_dir: bool) -> String {
    if is_dir {
        return "folder".to_string();
    }

    let ext = Path::new(name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_lowercase();
    match ext.as_str() {
        "ts" | "tsx" => "typescript".into(),
        "js" | "jsx" => "javascript".into(),
        "rs" => "rust".into(),
        "py" => "python".into(),
        "css" | "scss" | "less" => "css".into(),
        "html" => "html".into(),
        "json" => "json".into(),
        "md" => "markdown".into(),
        "toml" | "yaml" | "yml" => "config".into(),
        "png" | "jpg" | "jpeg" | "gif" | "svg" | "ico" => "image".into(),
        "zip" | "tar" | "gz" | "rar" | "7z" => "archive".into(),
        _ => "file".into(),
    }
}
