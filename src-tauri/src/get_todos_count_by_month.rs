// ==================== 年日历视图命令 ====================

/// 获取指定月份每天的待办数量
/// 返回格式：{ "01": 3, "02": 0, "15": 5 } 表示 1 号有 3 个待办，2 号有 0 个，15 号有 5 个
#[tauri::command]
pub fn get_todos_count_by_month(
    state: tauri::State<AppState>,
    year: i32,
    month: u32,
) -> Result<std::collections::HashMap<String, i64>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;

    // 计算该月的天数
    let days_in_month = chrono::NaiveDate::from_ymd_opt(year, month + 1, 1)
        .and_then(|d| d.checked_sub_days(chrono::Days::new(1)))
        .map(|d| d.day())
        .unwrap_or(31);

    // 初始化结果，所有天数为 0
    let mut result: std::collections::HashMap<String, i64> = std::collections::HashMap::new();
    for day in 1..=days_in_month {
        result.insert(format!("{:02}", day), 0);
    }

    // 计算该月第一天的星期和总天数
    let first_day = chrono::NaiveDate::from_ymd_opt(year, month, 1)
        .ok_or_else(|| "Invalid date".to_string())?;
    
    let last_day = chrono::NaiveDate::from_ymd_opt(year, month + 1, 1)
        .and_then(|d| d.checked_sub_days(chrono::Days::new(1)))
        .ok_or_else(|| "Invalid date".to_string())?;

    // 查询该月每天的待办数量
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
