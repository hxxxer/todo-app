use chrono::{Utc, Datelike};
use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use thiserror::Error;
use tauri::{AppHandle, Manager};

#[derive(Debug, Error)]
pub enum DbError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Todo {
    pub id: i64,
    pub title: String,
    pub date: String,
    pub start_time: String,
    pub deadline: Option<String>,
    pub notes: Option<String>,
    pub completed: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: i64,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
}

pub struct AppState {
    pub db: Mutex<Connection>,
}

impl AppState {
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| e.to_string())?;

        std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;

        let db_path = app_data_dir.join("todo_app.db");
        eprintln!("=== Database path: {:?}", db_path);

        let db = Connection::open(&db_path).map_err(|e| e.to_string())?;
        init_database(&db).map_err(|e| e.to_string())?;

        Ok(Self {
            db: Mutex::new(db),
        })
    }
}

fn init_database(conn: &Connection) -> Result<(), DbError> {
    // 创建表结构（最新版本）
    conn.execute(
        "CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            start_time TEXT NOT NULL DEFAULT '09:00',
            deadline TEXT,
            notes TEXT,
            completed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // 创建 documents 表（存储文档内容）
    conn.execute(
        "CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL UNIQUE,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;

    // 创建 todo_documents 表（关联待办和文档）
    conn.execute(
        "CREATE TABLE IF NOT EXISTS todo_documents (
            todo_id INTEGER NOT NULL,
            document_id INTEGER NOT NULL,
            PRIMARY KEY (todo_id, document_id),
            FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // 获取当前数据库版本
    let current_version: i32 = conn
        .pragma_query_value(None, "user_version", |row| row.get(0))
        .unwrap_or(0);

    // 根据版本执行迁移
    if current_version < 1 {
        migrate_v0_to_v1(conn)?;
        conn.pragma_update(None, "user_version", 1)
            .map_err(|e| DbError::Database(e))?;
    }

    Ok(())
}

/// 迁移 v0 → v1: 添加 start_time 列 + 迁移旧 deadline 数据
fn migrate_v0_to_v1(conn: &Connection) -> Result<(), DbError> {
    // 检查现有列
    let columns: Vec<String> = conn
        .prepare("PRAGMA table_info(todos)")?
        .query_map([], |row| row.get(1))?
        .filter_map(|r| r.ok())
        .collect();

    // 添加 completed 列（如果不存在）
    if !columns.contains(&"completed".to_string()) {
        conn.execute(
            "ALTER TABLE todos ADD COLUMN completed INTEGER NOT NULL DEFAULT 0",
            [],
        )?;
    }

    // 添加 start_time 列（如果不存在）
    if !columns.contains(&"start_time".to_string()) {
        conn.execute(
            "ALTER TABLE todos ADD COLUMN start_time TEXT NOT NULL DEFAULT '09:00'",
            [],
        )?;
    }

    // 迁移旧 deadline 数据：从 "YYYY-MM-DD" 升级为 "YYYY-MM-DD 12:00"
    // 只迁移不含时间的旧数据（不包含空格的 deadline）
    conn.execute(
        "UPDATE todos SET deadline = deadline || ' 12:00' WHERE deadline IS NOT NULL AND deadline NOT LIKE '% %'",
        [],
    )?;

    // 为旧数据设置默认开始时间
    conn.execute(
        "UPDATE todos SET start_time = '09:00' WHERE start_time IS NULL OR start_time = ''",
        [],
    )?;

    Ok(())
}

#[tauri::command]
pub fn init_db() -> Result<String, String> {
    Ok("Database initialized".to_string())
}

#[tauri::command]
pub fn create_todo(
    state: tauri::State<AppState>,
    title: String,
    date: String,
    start_time: String,
    deadline: Option<String>,
    notes: Option<String>,
    completed: Option<bool>,
) -> Result<Todo, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO todos (title, date, start_time, deadline, notes, completed, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![title, date, start_time, deadline, notes, completed.unwrap_or(false), now],
    )
    .map_err(|e| e.to_string())?;

    let id = db.last_insert_rowid();

    let todo = Todo {
        id,
        title,
        date,
        start_time,
        deadline,
        notes,
        completed: completed.unwrap_or(false),
        created_at: now,
    };

    Ok(todo)
}

#[tauri::command]
pub fn list_todos(state: tauri::State<AppState>, date: Option<String>) -> Result<Vec<Todo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut result = Vec::new();

    match &date {
        Some(d) => {
            let mut stmt = db
                .prepare("SELECT id, title, date, start_time, deadline, notes, completed, created_at FROM todos WHERE date = ?1 ORDER BY id DESC")
                .map_err(|e| e.to_string())?;
            let todos = stmt
                .query_map(params![d], |row| {
                    Ok(Todo {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        date: row.get(2)?,
                        start_time: row.get(3)?,
                        deadline: row.get(4)?,
                        notes: row.get(5)?,
                        completed: row.get::<_, i32>(6)? != 0,
                        created_at: row.get(7)?,
                    })
                })
                .map_err(|e| e.to_string())?;

            for todo in todos {
                result.push(todo.map_err(|e| e.to_string())?);
            }
        }
        None => {
            let mut stmt = db
                .prepare("SELECT id, title, date, start_time, deadline, notes, completed, created_at FROM todos ORDER BY id DESC")
                .map_err(|e| e.to_string())?;
            let todos = stmt
                .query_map([], |row| {
                    Ok(Todo {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        date: row.get(2)?,
                        start_time: row.get(3)?,
                        deadline: row.get(4)?,
                        notes: row.get(5)?,
                        completed: row.get::<_, i32>(6)? != 0,
                        created_at: row.get(7)?,
                    })
                })
                .map_err(|e| e.to_string())?;

            for todo in todos {
                result.push(todo.map_err(|e| e.to_string())?);
            }
        }
    }

    Ok(result)
}

#[tauri::command]
pub fn update_todo(
    state: tauri::State<AppState>,
    id: i64,
    title: Option<String>,
    start_time: Option<String>,
    deadline: Option<String>,
    notes: Option<String>,
    completed: Option<bool>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    if let Some(t) = title {
        db.execute("UPDATE todos SET title = ?1 WHERE id = ?2", params![t, id])
            .map_err(|e| e.to_string())?;
    }

    if let Some(s) = start_time {
        db.execute("UPDATE todos SET start_time = ?1 WHERE id = ?2", params![s, id])
            .map_err(|e| e.to_string())?;
    }

    if let Some(d) = deadline {
        db.execute("UPDATE todos SET deadline = ?1 WHERE id = ?2", params![d, id])
            .map_err(|e| e.to_string())?;
    }

    if let Some(n) = notes {
        db.execute("UPDATE todos SET notes = ?1 WHERE id = ?2", params![n, id])
            .map_err(|e| e.to_string())?;
    }

    if let Some(c) = completed {
        db.execute("UPDATE todos SET completed = ?1 WHERE id = ?2", params![if c { 1 } else { 0 }, id])
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn toggle_todo(state: tauri::State<AppState>, id: i64) -> Result<bool, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = db
        .prepare("SELECT completed FROM todos WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let current: i32 = stmt
        .query_row(params![id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let new_completed = current == 0;

    db.execute(
        "UPDATE todos SET completed = ?1 WHERE id = ?2",
        params![if new_completed { 1 } else { 0 }, id],
    )
    .map_err(|e| e.to_string())?;

    Ok(new_completed)
}

#[tauri::command]
pub fn get_all_todos_ordered(state: tauri::State<AppState>) -> Result<Vec<Todo>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut result = Vec::new();

    let mut stmt = db
        .prepare("SELECT id, title, date, start_time, deadline, notes, completed, created_at FROM todos ORDER BY date DESC, id DESC")
        .map_err(|e| e.to_string())?;

    let todos = stmt
        .query_map([], |row| {
            Ok(Todo {
                id: row.get(0)?,
                title: row.get(1)?,
                date: row.get(2)?,
                start_time: row.get(3)?,
                deadline: row.get(4)?,
                notes: row.get(5)?,
                completed: row.get::<_, i32>(6)? != 0,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    for todo in todos {
        result.push(todo.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

#[tauri::command]
pub fn delete_todo(state: tauri::State<AppState>, id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute("DELETE FROM todos WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ==================== Todo-Document 关联命令 ====================

#[tauri::command]
pub fn link_document_to_todo(
    state: tauri::State<AppState>,
    todo_id: i64,
    document_id: i64,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR IGNORE INTO todo_documents (todo_id, document_id) VALUES (?1, ?2)",
        params![todo_id, document_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn unlink_document_from_todo(
    state: tauri::State<AppState>,
    todo_id: i64,
    document_id: i64,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "DELETE FROM todo_documents WHERE todo_id = ?1 AND document_id = ?2",
        params![todo_id, document_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_linked_documents(
    state: tauri::State<AppState>,
    todo_id: i64,
) -> Result<Vec<Document>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let mut result = Vec::new();

    let mut stmt = db
        .prepare("SELECT document_id FROM todo_documents WHERE todo_id = ?1")
        .map_err(|e| e.to_string())?;

    let doc_ids = stmt
        .query_map(params![todo_id], |row| {
            row.get::<_, i64>(0)
        })
        .map_err(|e| e.to_string())?;

    for id_result in doc_ids {
        let doc_id = id_result.map_err(|e| e.to_string())?;

        // 从 documents 表读取文档内容
        let doc = db
            .query_row(
                "SELECT id, title, content, created_at, updated_at FROM documents WHERE id = ?1",
                params![doc_id],
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
            .map_err(|e| format!("读取文档失败：{}", e))?;

        result.push(doc);
    }

    Ok(result)
}

// ==================== 年日历视图命令 ====================

#[tauri::command]
pub fn get_todos_count_by_month(
    state: tauri::State<AppState>,
    year: i32,
    month: u32,
) -> Result<std::collections::HashMap<String, i64>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    let days_in_month = chrono::NaiveDate::from_ymd_opt(year, month + 1, 1)
        .and_then(|d| d.checked_sub_days(chrono::Days::new(1)))
        .map(|d| d.day())
        .unwrap_or(31);

    let mut result: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    for day in 1..=days_in_month {
        result.insert(format!("{:02}", day), 0);
    }

    let _first_day = chrono::NaiveDate::from_ymd_opt(year, month, 1)
        .ok_or_else(|| "Invalid date".to_string())?;
    
    let last_day = chrono::NaiveDate::from_ymd_opt(year, month + 1, 1)
        .and_then(|d| d.checked_sub_days(chrono::Days::new(1)))
        .ok_or_else(|| "Invalid date".to_string())?;

    let mut stmt = db
        .prepare(
            "SELECT SUBSTR(date, 9, 2) as day, COUNT(*) as count
             FROM todos
             WHERE date >= ?1 AND date <= ?2
             GROUP BY day",
        )
        .map_err(|e| e.to_string())?;

    let date_start = format!("{:04}-{:02}-01", year, month);
    let date_end = format!("{:04}-{:02}-{:02}", year, month, last_day.day());

    let rows = stmt
        .query_map(params![date_start, date_end], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
        })
        .map_err(|e| e.to_string())?;

    for row in rows {
        let (day, count) = row.map_err(|e| e.to_string())?;
        result.insert(day, count);
    }

    Ok(result)
}
