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
    conn.execute(
        "CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            date TEXT NOT NULL,
            deadline TEXT,
            notes TEXT,
            completed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    let pragma_result: Result<Vec<String>, _> = conn
        .prepare("PRAGMA table_info(todos)")
        .and_then(|mut stmt| {
            stmt.query_map([], |row| row.get::<_, String>(1))
                .map(|rows| rows.filter_map(|r| r.ok()).collect())
        });

    if let Ok(columns) = pragma_result {
        if !columns.contains(&"completed".to_string()) {
            conn.execute(
                "ALTER TABLE todos ADD COLUMN completed INTEGER NOT NULL DEFAULT 0",
                [],
            )?;
        }
    }

    // 使用 PRAGMA 检查表结构
    let table_exists: bool = conn.query_row(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='todo_documents'",
        [],
        |_| Ok(true)
    ).unwrap_or(false);

    if table_exists {
        // 检查表结构是否符合预期
        let mut stmt = conn.prepare("PRAGMA table_info(todo_documents)")?;
        let columns = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(1)?, // name
                row.get::<_, String>(2)?, // type
                row.get::<_, i32>(3)?,    // notnull
            ))
        })?.collect::<Result<Vec<_>, _>>()?;
        
        let expected_columns = vec![
            ("todo_id".to_string(), "INTEGER".to_string(), 1),
            ("document_title".to_string(), "TEXT".to_string(), 1),
        ];
        
        // 如果列数不匹配或列定义不匹配，则删除重建
        if columns.len() != 2 || columns != expected_columns {
            conn.execute("DROP TABLE todo_documents", [])?;
            conn.execute(
                "CREATE TABLE todo_documents (
                    todo_id INTEGER NOT NULL,
                    document_title TEXT NOT NULL,
                    PRIMARY KEY (todo_id, document_title),
                    FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
                )",
                [],
            )?;
        }
    } else {
        // 表不存在，直接创建
        conn.execute(
            "CREATE TABLE todo_documents (
                todo_id INTEGER NOT NULL,
                document_title TEXT NOT NULL,
                PRIMARY KEY (todo_id, document_title),
                FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
            )",
            [],
        )?;
    }

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
    deadline: Option<String>,
    notes: Option<String>,
    completed: Option<bool>,
) -> Result<Todo, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let now = Utc::now().to_rfc3339();

    db.execute(
        "INSERT INTO todos (title, date, deadline, notes, completed, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![title, date, deadline, notes, completed.unwrap_or(false), now],
    )
    .map_err(|e| e.to_string())?;

    let id = db.last_insert_rowid();

    let todo = Todo {
        id,
        title,
        date,
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
                .prepare("SELECT id, title, date, deadline, notes, completed, created_at FROM todos WHERE date = ?1 ORDER BY id DESC")
                .map_err(|e| e.to_string())?;
            let todos = stmt
                .query_map(params![d], |row| {
                    Ok(Todo {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        date: row.get(2)?,
                        deadline: row.get(3)?,
                        notes: row.get(4)?,
                        completed: row.get::<_, i32>(5)? != 0,
                        created_at: row.get(6)?,
                    })
                })
                .map_err(|e| e.to_string())?;

            for todo in todos {
                result.push(todo.map_err(|e| e.to_string())?);
            }
        }
        None => {
            let mut stmt = db
                .prepare("SELECT id, title, date, deadline, notes, completed, created_at FROM todos ORDER BY id DESC")
                .map_err(|e| e.to_string())?;
            let todos = stmt
                .query_map([], |row| {
                    Ok(Todo {
                        id: row.get(0)?,
                        title: row.get(1)?,
                        date: row.get(2)?,
                        deadline: row.get(3)?,
                        notes: row.get(4)?,
                        completed: row.get::<_, i32>(5)? != 0,
                        created_at: row.get(6)?,
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
    deadline: Option<String>,
    notes: Option<String>,
    completed: Option<bool>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    if let Some(t) = title {
        db.execute("UPDATE todos SET title = ?1 WHERE id = ?2", params![t, id])
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
        .prepare("SELECT id, title, date, deadline, notes, completed, created_at FROM todos ORDER BY date DESC, id DESC")
        .map_err(|e| e.to_string())?;

    let todos = stmt
        .query_map([], |row| {
            Ok(Todo {
                id: row.get(0)?,
                title: row.get(1)?,
                date: row.get(2)?,
                deadline: row.get(3)?,
                notes: row.get(4)?,
                completed: row.get::<_, i32>(5)? != 0,
                created_at: row.get(6)?,
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

#[tauri::command]
pub fn link_document_to_todo(
    state: tauri::State<AppState>,
    todo_id: i64,
    document_title: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "INSERT OR IGNORE INTO todo_documents (todo_id, document_title) VALUES (?1, ?2)",
        params![todo_id, document_title],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn unlink_document_from_todo(
    state: tauri::State<AppState>,
    todo_id: i64,
    document_title: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.execute(
        "DELETE FROM todo_documents WHERE todo_id = ?1 AND document_title = ?2",
        params![todo_id, document_title],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_linked_documents(
    state: tauri::State<AppState>,
    todo_id: i64,
    app_handle: AppHandle,
) -> Result<Vec<Document>, String> {
    use crate::document_commands::{get_knowledge_dir, system_time_to_datetime};
    
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let knowledge_dir = get_knowledge_dir(&app_handle)?;
    let mut result = Vec::new();

    let mut stmt = db
        .prepare("SELECT document_title FROM todo_documents WHERE todo_id = ?1")
        .map_err(|e| e.to_string())?;

    let titles = stmt
        .query_map(params![todo_id], |row| {
            row.get::<_, String>(0)
        })
        .map_err(|e| e.to_string())?;

    for title_result in titles {
        let title = title_result.map_err(|e| e.to_string())?;
        let safe_title = sanitize_filename(&title);
        let file_path = knowledge_dir.join(format!("{}.md", safe_title));
        
        if let Ok(content) = std::fs::read_to_string(&file_path) {
            if let Ok(metadata) = std::fs::metadata(&file_path) {
                if let Ok(modified) = metadata.modified() {
                    let created = metadata.created().unwrap_or(modified);
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
