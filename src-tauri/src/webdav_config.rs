use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum WebDavConfigError {
    #[error("配置加载失败：{0}")]
    LoadError(String),
    #[error("配置保存失败：{0}")]
    SaveError(String),
    #[error("配置不存在")]
    NotExists,
}

/// WebDAV 配置结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebDavConfig {
    /// WebDAV 服务器地址
    pub server_url: String,
    /// 用户名
    pub username: String,
    /// 密码（加密存储）
    pub password: String,
    /// 远程文件夹路径
    pub remote_path: String,
    /// 本地数据库路径（自动获取，不保存）
    #[serde(skip)]
    pub local_db_path: Option<PathBuf>,
}

impl WebDavConfig {
    /// 获取配置文件路径
    fn get_config_path(app_handle: &AppHandle) -> Result<PathBuf, String> {
        let data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("获取应用数据目录失败：{}", e))?;
        Ok(data_dir.join("webdav_config.json"))
    }

    /// 加载配置
    pub fn load(app_handle: &AppHandle) -> Result<Option<Self>, WebDavConfigError> {
        let config_path = Self::get_config_path(app_handle)
            .map_err(|e| WebDavConfigError::LoadError(e))?;

        if !config_path.exists() {
            return Ok(None);
        }

        let content = fs::read_to_string(&config_path)
            .map_err(|e| WebDavConfigError::LoadError(format!("读取文件失败：{}", e)))?;

        let mut config: Self = serde_json::from_str(&content)
            .map_err(|e| WebDavConfigError::LoadError(format!("解析配置失败：{}", e)))?;

        // 获取本地数据库路径
        if let Ok(db_path) = app_handle.path().app_data_dir() {
            config.local_db_path = Some(db_path.join("todo_app.db"));
        }

        Ok(Some(config))
    }

    /// 保存配置
    pub fn save(&self, app_handle: &AppHandle) -> Result<(), WebDavConfigError> {
        let config_path = Self::get_config_path(app_handle)
            .map_err(|e| WebDavConfigError::SaveError(e))?;

        // 确保目录存在
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| WebDavConfigError::SaveError(format!("创建目录失败：{}", e)))?;
        }

        let content = serde_json::to_string_pretty(self)
            .map_err(|e| WebDavConfigError::SaveError(format!("序列化配置失败：{}", e)))?;

        fs::write(&config_path, content)
            .map_err(|e| WebDavConfigError::SaveError(format!("写入文件失败：{}", e)))?;

        Ok(())
    }

    /// 删除配置
    pub fn delete(app_handle: &AppHandle) -> Result<(), WebDavConfigError> {
        let config_path = Self::get_config_path(app_handle)
            .map_err(|e| WebDavConfigError::LoadError(e))?;

        if config_path.exists() {
            fs::remove_file(&config_path)
                .map_err(|e| WebDavConfigError::SaveError(format!("删除配置失败：{}", e)))?;
        }

        Ok(())
    }

    /// 检查配置是否完整
    pub fn is_complete(&self) -> bool {
        !self.server_url.is_empty()
            && !self.username.is_empty()
            && !self.password.is_empty()
            && !self.remote_path.is_empty()
    }
}

/// 获取 WebDAV 配置
#[tauri::command]
pub fn get_webdav_config(app_handle: AppHandle) -> Result<Option<WebDavConfig>, String> {
    WebDavConfig::load(&app_handle).map_err(|e| e.to_string())
}

/// 保存 WebDAV 配置
#[tauri::command]
pub fn save_webdav_config(
    app_handle: AppHandle,
    server_url: String,
    username: String,
    password: String,
    remote_path: String,
) -> Result<(), String> {
    let config = WebDavConfig {
        server_url,
        username,
        password,
        remote_path,
        local_db_path: None,
    };
    config.save(&app_handle).map_err(|e| e.to_string())
}

/// 删除 WebDAV 配置
#[tauri::command]
pub fn delete_webdav_config(app_handle: AppHandle) -> Result<(), String> {
    WebDavConfig::delete(&app_handle).map_err(|e| e.to_string())
}

/// 测试 WebDAV 连接
#[tauri::command]
pub async fn test_webdav_connection(app_handle: AppHandle) -> Result<String, String> {
    let config = WebDavConfig::load(&app_handle)
        .map_err(|e| e.to_string())?
        .ok_or("WebDAV 配置不存在")?;

    if !config.is_complete() {
        return Err("配置不完整".to_string());
    }

    // 使用 PROPFIND 请求测试连接
    let client = reqwest::Client::new();
    let url = format!("{}{}", config.server_url, config.remote_path.trim_start_matches('/'));
    
    let response = client
        .request(reqwest::Method::from_bytes(b"PROPFIND").unwrap(), &url)
        .basic_auth(&config.username, Some(&config.password))
        .header("Depth", "0")
        .send()
        .await;

    match response {
        Ok(resp) => {
            if resp.status().is_success() || resp.status() == 207 {
                Ok("连接成功".to_string())
            } else {
                Err(format!("连接失败：HTTP {}", resp.status()))
            }
        }
        Err(e) => Err(format!("连接失败：{}", e)),
    }
}
