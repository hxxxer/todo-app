// ============================================
// 文档管理命令 - 存储到 SQLite 数据库
// ============================================

use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub fn create_document(
    app_handle: AppHandle,
    title: String,
    content: String,
) -> Result<Document, String> {
    let state = app_handle.state::<crate::commands::AppState>();
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO documents (title, content, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
        params![title, content, now, now],
    )
    .map_err(|e| format!("创建文档失败：{}", e))?;

    let id = db.last_insert_rowid();

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
    let state = app_handle.state::<crate::commands::AppState>();
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut result = Vec::new();

    let mut stmt = db
        .prepare("SELECT id, title, content, created_at, updated_at FROM documents ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let docs = stmt
        .query_map([], |row| {
            Ok(Document {
                id: row.get(0)?,
                title: row.get(1)?,
                content: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;

    for doc in docs {
        result.push(doc.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[tauri::command]
pub fn get_document(
    app_handle: AppHandle,
    title: String,
) -> Result<Document, String> {
    let state = app_handle.state::<crate::commands::AppState>();
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let doc = db
        .query_row(
            "SELECT id, title, content, created_at, updated_at FROM documents WHERE title = ?1",
            params![title],
            |row| {
                Ok(Document {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    content: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                })
            },
        )
        .map_err(|e| format!("获取文档失败：{}", e))?;

    Ok(doc)
}

#[tauri::command]
pub fn update_document(
    app_handle: AppHandle,
    id: i64,
    title: Option<String>,
    content: Option<String>,
) -> Result<(), String> {
    let state = app_handle.state::<crate::commands::AppState>();
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    // 如果需要更新标题
    if let Some(new_title) = &title {
        db.execute(
            "UPDATE documents SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_title, now, id],
        )
        .map_err(|e| format!("更新标题失败：{}", e))?;
    }

    // 如果需要更新内容
    if let Some(new_content) = &content {
        db.execute(
            "UPDATE documents SET content = ?1, updated_at = ?2 WHERE id = ?3",
            params![new_content, now, id],
        )
        .map_err(|e| format!("更新内容失败：{}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn delete_document(app_handle: AppHandle, id: i64) -> Result<(), String> {
    let state = app_handle.state::<crate::commands::AppState>();
    let db = state.db.lock().map_err(|e| e.to_string())?;

    db.execute(
        "DELETE FROM documents WHERE id = ?1",
        params![id],
    )
    .map_err(|e| format!("删除文档失败：{}", e))?;

    Ok(())
}

// ============================================
// 外部编辑器功能 - 已注释保留，供将来扩展
// ============================================

// #[tauri::command]
// pub fn open_document_with_editor(
//     app_handle: AppHandle,
//     id: i64,
// ) -> Result<(), String> {
//     // 功能暂未启用
//     // 将来实现：导出临时文件 -> 调用外部编辑器 -> 监听文件变化 -> 保存回数据库
//     Err("功能暂未启用".to_string())
// }

/// 获取所有文档用于选择器
#[tauri::command]
pub fn get_all_documents_for_selection(app_handle: AppHandle) -> Result<Vec<Document>, String> {
    list_documents(app_handle)
}
