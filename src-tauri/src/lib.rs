mod commands;
mod document_commands;
mod webdav_config;
mod webdav_sync;

use commands::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let app_state = AppState::new(app.handle())?;
            app.manage(app_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::init_db,
            commands::create_todo,
            commands::list_todos,
            commands::update_todo,
            commands::toggle_todo,
            commands::get_all_todos_ordered,
            commands::delete_todo,
            document_commands::create_document,
            document_commands::list_documents,
            document_commands::get_document,
            document_commands::update_document,
            document_commands::delete_document,
            document_commands::get_all_documents_for_selection,
            commands::link_document_to_todo,
            commands::unlink_document_from_todo,
            commands::get_linked_documents,
            commands::get_todos_count_by_month,
            webdav_config::get_webdav_config,
            webdav_config::save_webdav_config,
            webdav_config::delete_webdav_config,
            webdav_config::test_webdav_connection,
            webdav_sync::upload_to_webdav,
            webdav_sync::download_from_webdav,
            webdav_sync::sync_with_webdav,
            webdav_sync::get_sync_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
