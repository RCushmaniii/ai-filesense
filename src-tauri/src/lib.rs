mod commands;
mod db;
mod scanner;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize database on startup
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");

            let db_path = app_data_dir.join("filesense.db");
            db::init_database(&db_path).expect("Failed to initialize database");

            // Store db path in app state
            app.manage(db::DbPath(db_path));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan_directories,
            commands::get_scan_status,
            commands::search_files,
            commands::get_file_details,
            commands::generate_organization_plan,
            commands::execute_plan,
            commands::undo_last_operation,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
