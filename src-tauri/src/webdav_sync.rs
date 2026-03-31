use crate::webdav_config::WebDavConfig;
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

/// 上传数据库到 WebDAV
#[tauri::command]
pub async fn upload_to_webdav(app_handle: AppHandle) -> Result<String, String> {
    let config = WebDavConfig::load(&app_handle)
        .map_err(|e| e.to_string())?
        .ok_or("WebDAV 配置不存在")?;

    if !config.is_complete() {
        return Err("配置不完整，请先配置 WebDAV".to_string());
    }

    let local_db_path = config.local_db_path.ok_or("本地数据库路径未知")?;

    if !local_db_path.exists() {
        return Err("本地数据库文件不存在".to_string());
    }

    // 读取本地数据库文件
    let file_content = fs::read(&local_db_path)
        .map_err(|e| format!("读取本地数据库失败：{}", e))?;

    // 构建远程文件 URL
    let remote_dir = config.remote_path.trim_start_matches('/').trim_end_matches('/');
    let remote_file_path = format!("{}/todo_app.db", remote_dir);
    let url = format!("{}{}", config.server_url, remote_file_path);

    // 创建 WebDAV 客户端并上传
    let client = reqwest::Client::new();
    
    match client
        .put(&url)
        .basic_auth(&config.username, Some(&config.password))
        .body(file_content)
        .send()
        .await
    {
        Ok(resp) => {
            if resp.status().is_success() || resp.status() == 201 || resp.status() == 204 {
                let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
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

    let local_db_path = config.local_db_path.ok_or("本地数据库路径未知")?;
    let remote_dir = config.remote_path.trim_start_matches('/').trim_end_matches('/');
    let remote_file_path = format!("{}/todo_app.db", remote_dir);
    let url = format!("{}{}", config.server_url, remote_file_path);

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
