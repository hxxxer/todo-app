// ============================================
// 文档管理命令 - 保存到 .md 文件
// ============================================

use chrono::{Utc, DateTime};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

/// 获取知识库目录路径
pub fn get_knowledge_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let knowledge_dir = app_data_dir.join("knowledge");
    std::fs::create_dir_all(&knowledge_dir).map_err(|e| e.to_string())?;
    
    Ok(knowledge_dir)
}

/// 生成新的文档 ID（基于文件修改时间）
fn generate_new_doc_id() -> i64 {
    Utc::now().timestamp_millis() as i64
}

/// 将 SystemTime 转换为 DateTime<Utc>
pub fn system_time_to_datetime(time: std::time::SystemTime) -> DateTime<Utc> {
    time.into()
}

#[tauri::command]
pub fn create_document(
    app_handle: AppHandle,
    title: String,
    content: String,
) -> Result<Document, String> {
    let knowledge_dir = get_knowledge_dir(&app_handle)?;
    let now = Utc::now().to_rfc3339();
    let id = generate_new_doc_id();
    
    // 文件名格式：标题.md
    let safe_title = sanitize_filename(&title);
    let filename = format!("{}.md", safe_title);
    let file_path = knowledge_dir.join(&filename);
    
    // 写入文件内容（只有内容，没有标题）
    std::fs::write(&file_path, &content).map_err(|e| e.to_string())?;
    
    Ok(Document {
        id,
        title,
        content,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
pub fn list_documents(app_handle: AppHandle) -> Result<Vec<Document>, String> {
    let knowledge_dir = get_knowledge_dir(&app_handle)?;
    let mut result = Vec::new();
    
    if let Ok(entries) = std::fs::read_dir(&knowledge_dir) {
        let mut files: Vec<_> = entries
            .flatten()
            .filter(|e| e.file_name().to_string_lossy().ends_with(".md"))
            .collect();
        
        // 按文件名排序
        files.sort_by(|a, b| a.file_name().cmp(&b.file_name()));
        
        for entry in files {
            let filename = entry.file_name();
            let filename_str = filename.to_string_lossy();
            
            // 从文件名提取标题（去掉 .md 后缀）
            let title = filename_str.trim_end_matches(".md").to_string();
            
            // 读取文件内容
            if let Ok(content) = std::fs::read_to_string(entry.path()) {
                // 获取文件修改时间
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        let created = metadata.created().unwrap_or(modified);
                        
                        // 使用时间戳作为 ID
                        let id = modified
                            .duration_since(std::time::UNIX_EPOCH)
                            .map(|d| d.as_millis() as i64)
                            .unwrap_or(0);
                        
                        result.push(Document {
                            id,
                            title,
                            content,
                            created_at: system_time_to_datetime(created).to_rfc3339(),
                            updated_at: system_time_to_datetime(modified).to_rfc3339(),
                        });
                    }
                }
            }
        }
    }
    
    // 按标题排序
    result.sort_by(|a, b| a.title.cmp(&b.title));
    Ok(result)
}

#[tauri::command]
pub fn get_document(
    app_handle: AppHandle,
    title: String,
) -> Result<Document, String> {
    let knowledge_dir = get_knowledge_dir(&app_handle)?;
    let safe_title = sanitize_filename(&title);
    let filename = format!("{}.md", safe_title);
    let file_path = knowledge_dir.join(&filename);
    
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("读取文件失败：{}", e))?;
    
    // 获取文件时间
    let metadata = std::fs::metadata(&file_path).map_err(|e| e.to_string())?;
    let modified = metadata.modified().map_err(|e| e.to_string())?;
    let created = metadata.created().unwrap_or(modified);
    
    let id = modified
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0);
    
    Ok(Document {
        id,
        title,
        content,
        created_at: system_time_to_datetime(created).to_rfc3339(),
        updated_at: system_time_to_datetime(modified).to_rfc3339(),
    })
}

#[tauri::command]
pub fn update_document(
    app_handle: AppHandle,
    id: i64,
    title: Option<String>,
    content: Option<String>,
) -> Result<(), String> {
    let knowledge_dir = get_knowledge_dir(&app_handle)?;
    
    // 根据 ID 查找文件（通过遍历所有文件）
    let mut target_file: Option<PathBuf> = None;
    if let Ok(entries) = std::fs::read_dir(&knowledge_dir) {
        for entry in entries.flatten() {
            if entry.file_name().to_string_lossy().ends_with(".md") {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        let timestamp = modified
                            .duration_since(std::time::UNIX_EPOCH)
                            .map(|d| d.as_millis() as i64)
                            .unwrap_or(0);
                        if timestamp == id {
                            target_file = Some(entry.path());
                            break;
                        }
                    }
                }
            }
        }
    }
    
    let file_path = target_file.ok_or("文件不存在".to_string())?;
    
    // 读取现有内容
    let existing = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("读取文件失败：{}", e))?;
    
    // 使用新值或保留现有值
    let new_content = content.unwrap_or(existing);
    
    // 如果需要更新标题，则重命名文件
    if let Some(new_title) = title {
        let safe_title = sanitize_filename(&new_title);
        let new_filename = format!("{}.md", safe_title);
        let new_file_path = knowledge_dir.join(&new_filename);
        
        // 如果文件名不同，则重命名
        if file_path != new_file_path {
            std::fs::rename(&file_path, &new_file_path).map_err(|e| e.to_string())?;
        }
    }
    
    // 写入新内容
    std::fs::write(&file_path, &new_content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub fn delete_document(app_handle: AppHandle, id: i64) -> Result<(), String> {
    let knowledge_dir = get_knowledge_dir(&app_handle)?;
    
    // 根据 ID 查找文件
    let mut target_file: Option<PathBuf> = None;
    if let Ok(entries) = std::fs::read_dir(&knowledge_dir) {
        for entry in entries.flatten() {
            if entry.file_name().to_string_lossy().ends_with(".md") {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        let timestamp = modified
                            .duration_since(std::time::UNIX_EPOCH)
                            .map(|d| d.as_millis() as i64)
                            .unwrap_or(0);
                        if timestamp == id {
                            target_file = Some(entry.path());
                            break;
                        }
                    }
                }
            }
        }
    }
    
    let file_path = target_file.ok_or("文件不存在".to_string())?;
    std::fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn open_document_with_editor(
    app_handle: AppHandle,
    id: i64,
) -> Result<(), String> {
    let knowledge_dir = get_knowledge_dir(&app_handle)?;
    
    // 根据 ID 查找文件
    let mut target_file: Option<PathBuf> = None;
    if let Ok(entries) = std::fs::read_dir(&knowledge_dir) {
        for entry in entries.flatten() {
            if entry.file_name().to_string_lossy().ends_with(".md") {
                if let Ok(metadata) = entry.metadata() {
                    if let Ok(modified) = metadata.modified() {
                        let timestamp = modified
                            .duration_since(std::time::UNIX_EPOCH)
                            .map(|d| d.as_millis() as i64)
                            .unwrap_or(0);
                        if timestamp == id {
                            target_file = Some(entry.path());
                            break;
                        }
                    }
                }
            }
        }
    }
    
    let file_path = target_file.ok_or("文件不存在".to_string())?;
    
    if !file_path.exists() {
        return Err("文件不存在".to_string());
    }
    
    // 使用系统默认程序打开 .md 文件
    #[cfg(target_os = "windows")]
    {
        let editor_path = PathBuf::from("D:\\Program Files\\Notepad4\\Notepad4.exe");
        std::process::Command::new(editor_path)
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("打开文件失败：{}", e))?;
    }
    
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(file_path)
            .spawn()
            .map_err(|e| format!("打开文件失败：{}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(file_path)
            .spawn()
            .map_err(|e| format!("打开文件失败：{}", e))?;
    }
    
    Ok(())
}

/// 清理文件名中的非法字符
fn sanitize_filename(title: &str) -> String {
    title
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            _ => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

/// 从文件名提取标题
fn extract_title_from_filename(filename: &str) -> String {
    filename.trim_end_matches(".md").to_string()
}

/// 获取所有文档用于选择器
#[tauri::command]
pub fn get_all_documents_for_selection(app_handle: AppHandle) -> Result<Vec<Document>, String> {
    list_documents(app_handle)
}
