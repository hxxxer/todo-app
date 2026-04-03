use crate::webdav_config::WebDavConfig;
use chrono::{Local, NaiveDateTime};
use std::fs;
use tauri::{AppHandle, Manager};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum WebDavSyncError {
    #[error("配置加载失败：{0}")]
    ConfigError(String),
    #[error("文件操作失败：{0}")]
    FileError(String),
    #[error("同步失败：{0}")]
    SyncError(String),
}

/// 同步状态
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SyncStatus {
    pub is_syncing: bool,
    pub last_sync_time: Option<String>,
    pub last_sync_result: Option<String>,
}

impl Default for SyncStatus {
    fn default() -> Self {
        Self {
            is_syncing: false,
            last_sync_time: None,
            last_sync_result: None,
        }
    }
}

/// 解析备份文件名中的时间
fn parse_backup_time(filename: &str) -> Option<NaiveDateTime> {
    // todo_app-20260405_143022.db -> 20260405_143022
    let time_str = filename
        .strip_prefix("todo_app-")?
        .strip_suffix(".db")?;
    NaiveDateTime::parse_from_str(time_str, "%Y%m%d_%H%M%S").ok()
}

/// 列出云端文件
async fn list_remote_files(config: &WebDavConfig) -> Result<Vec<String>, String> {
    let server_url = config.server_url.trim_end_matches('/');
    let remote_dir = config.remote_path.trim_start_matches('/').trim_end_matches('/');
    let url = format!("{}/{}/", server_url, remote_dir);

    let client = reqwest::Client::new();
    let resp = client
        .request(reqwest::Method::from_bytes(b"PROPFIND").unwrap(), &url)
        .basic_auth(&config.username, Some(&config.password))
        .header("Depth", "1")
        .send()
        .await
        .map_err(|e| format!("列出文件失败：{}", e))?;

    if !resp.status().is_success() && resp.status() != 207 {
        return Err(format!("列出文件失败：HTTP {}", resp.status()));
    }

    let body = resp.text().await.map_err(|e| format!("读取响应失败：{}", e))?;

    // 简单解析 XML 响应，提取文件名
    let mut files = Vec::new();
    for line in body.lines() {
        if line.contains("<D:href>") || line.contains("<d:href>") {
            // 提取 href 内容
            if let Some(start) = line.find("<D:href>").or_else(|| line.find("<d:href>")) {
                if let Some(end) = line.find("</D:href>").or_else(|| line.find("</d:href>")) {
                    let href = &line[start + 8..end];
                    // 提取文件名
                    if let Some(filename) = href.split('/').last() {
                        if !filename.is_empty() && filename.starts_with("todo_app") {
                            files.push(filename.to_string());
                        }
                    }
                }
            }
        }
    }

    Ok(files)
}

/// 重命名云端文件
async fn rename_remote_file(
    config: &WebDavConfig,
    old_name: &str,
    new_name: &str,
) -> Result<(), String> {
    let server_url = config.server_url.trim_end_matches('/');
    let remote_dir = config.remote_path.trim_start_matches('/').trim_end_matches('/');
    let old_url = format!("{}/{}/{}", server_url, remote_dir, old_name);
    let new_url = format!("{}/{}/{}", server_url, remote_dir, new_name);

    let client = reqwest::Client::new();
    let resp = client
        .request(reqwest::Method::from_bytes(b"MOVE").unwrap(), &old_url)
        .basic_auth(&config.username, Some(&config.password))
        .header("Destination", &new_url)
        .header("Overwrite", "T")
        .send()
        .await
        .map_err(|e| format!("重命名失败：{}", e))?;

    if !resp.status().is_success() && resp.status() != 201 && resp.status() != 204 {
        return Err(format!("重命名失败：HTTP {}", resp.status()));
    }

    Ok(())
}

/// 删除云端文件
async fn delete_remote_file(config: &WebDavConfig, filename: &str) -> Result<(), String> {
    let server_url = config.server_url.trim_end_matches('/');
    let remote_dir = config.remote_path.trim_start_matches('/').trim_end_matches('/');
    let url = format!("{}/{}/{}", server_url, remote_dir, filename);

    let client = reqwest::Client::new();
    let resp = client
        .delete(&url)
        .basic_auth(&config.username, Some(&config.password))
        .send()
        .await
        .map_err(|e| format!("删除失败：{}", e))?;

    if !resp.status().is_success() && resp.status() != 204 {
        return Err(format!("删除失败：HTTP {}", resp.status()));
    }

    Ok(())
}

/// 管理备份文件数量（保留最新的 7 个）
async fn manage_backups(config: &WebDavConfig) -> Result<(), String> {
    let files = list_remote_files(config).await?;

    // 过滤出备份文件
    let mut backups: Vec<(String, NaiveDateTime)> = files
        .into_iter()
        .filter(|f| f.starts_with("todo_app-") && f.ends_with(".db"))
        .filter_map(|f| {
            parse_backup_time(&f).map(|t| (f, t))
        })
        .collect();

    // 按时间排序
    backups.sort_by_key(|(_, t)| *t);

    // 删除最旧的，保留最新的 7 个
    while backups.len() > 7 {
        let (oldest, _) = backups.remove(0);
        eprintln!("删除旧备份：{}", oldest);
        delete_remote_file(config, &oldest).await?;
    }

    Ok(())
}

/// 上传数据库到 WebDAV（带备份）
#[tauri::command]
pub async fn upload_to_webdav(app_handle: AppHandle) -> Result<String, String> {
    let config = WebDavConfig::load(&app_handle)
        .map_err(|e| e.to_string())?
        .ok_or("WebDAV 配置不存在")?;

    if !config.is_complete() {
        return Err("配置不完整，请先配置 WebDAV".to_string());
    }

    let local_db_path = config.local_db_path.as_ref().ok_or("本地数据库路径未知")?;

    if !local_db_path.exists() {
        return Err("本地数据库文件不存在".to_string());
    }

    // 读取本地数据库文件
    let file_content = fs::read(local_db_path)
        .map_err(|e| format!("读取本地数据库失败：{}", e))?;

    let server_url = config.server_url.trim_end_matches('/');
    let remote_dir = config.remote_path.trim_start_matches('/').trim_end_matches('/');
    let client = reqwest::Client::new();

    // 检查云端是否存在 todo_app.db
    let main_file_url = format!("{}/{}/todo_app.db", server_url, remote_dir);
    let check_resp = client
        .request(reqwest::Method::from_bytes(b"PROPFIND").unwrap(), &main_file_url)
        .basic_auth(&config.username, Some(&config.password))
        .header("Depth", "0")
        .send()
        .await;

    if let Ok(resp) = check_resp {
        if resp.status().is_success() || resp.status() == 207 {
            // 云端存在文件，先备份
            let timestamp = Local::now().format("%Y%m%d_%H%M%S");
            let backup_name = format!("todo_app-{}.db", timestamp);

            eprintln!("备份云端文件：{}", backup_name);
            rename_remote_file(&config, "todo_app.db", &backup_name).await?;

            // 管理备份数量
            manage_backups(&config).await?;
        }
    }

    // 上传新文件
    let url = format!("{}/{}/todo_app.db", server_url, remote_dir);

    match client
        .put(&url)
        .basic_auth(&config.username, Some(&config.password))
        .body(file_content)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() || resp.status() == 201 || resp.status() == 204 {
                let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                Ok(format!("上传成功！时间：{}", now))
            } else {
                Err(format!("上传失败：HTTP {}", resp.status()))
            }
        }
        Err(e) => Err(format!("上传失败：{}", e)),
    }
}

/// 从 WebDAV 下载数据库
#[tauri::command]
pub async fn download_from_webdav(app_handle: AppHandle) -> Result<String, String> {
    let config = WebDavConfig::load(&app_handle)
        .map_err(|e| e.to_string())?
        .ok_or("WebDAV 配置不存在")?;

    if !config.is_complete() {
        return Err("配置不完整，请先配置 WebDAV".to_string());
    }

    let local_db_path = config.local_db_path.as_ref().ok_or("本地数据库路径未知")?;
    let server_url = config.server_url.trim_end_matches('/');
    let remote_dir = config.remote_path.trim_start_matches('/').trim_end_matches('/');
    let url = format!("{}/{}/todo_app.db", server_url, remote_dir);

    // 创建 WebDAV 客户端并下载
    let client = reqwest::Client::new();
    
    match client
        .get(&url)
        .basic_auth(&config.username, Some(&config.password))
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() {
                let bytes = resp.bytes().await
                    .map_err(|e| format!("读取响应失败：{}", e))?;
                
                // 备份当前数据库
                if local_db_path.exists() {
                    let backup_path = local_db_path.with_extension("db.backup");
                    fs::copy(&local_db_path, &backup_path)
                        .map_err(|e| format!("备份当前数据库失败：{}", e))?;
                }

                // 写入新数据库
                fs::write(&local_db_path, bytes)
                    .map_err(|e| format!("写入数据库失败：{}", e))?;

                let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                Ok(format!("下载成功！时间：{}", now))
            } else {
                Err(format!("下载失败：HTTP {}", resp.status()))
            }
        }
        Err(e) => Err(format!("下载失败：{}", e)),
    }
}

/// 同步（先上传再下载，用于冲突检测）
#[tauri::command]
pub async fn sync_with_webdav(app_handle: AppHandle) -> Result<String, String> {
    // 先上传本地更改
    let upload_result = upload_to_webdav(app_handle.clone()).await?;
    Ok(upload_result)
}

/// 获取同步状态
#[tauri::command]
pub fn get_sync_status(app_handle: AppHandle) -> Result<SyncStatus, String> {
    // 从配置文件中读取同步状态
    let status_path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败：{}", e))?
        .join("sync_status.json");

    if status_path.exists() {
        let content = fs::read_to_string(&status_path)
            .map_err(|e| format!("读取状态失败：{}", e))?;
        let status: SyncStatus = serde_json::from_str(&content)
            .map_err(|e| format!("解析状态失败：{}", e))?;
        Ok(status)
    } else {
        Ok(SyncStatus::default())
    }
}
