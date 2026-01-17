mod activity_log;
mod ai;
pub mod category;
mod commands;
mod db;
pub mod document_type;
mod recovery;
mod scanner;

// Re-export key types for external use
pub use category::{Category, normalize_folder};
pub use document_type::DocumentType;

use tauri::Manager;

/// Manually parse .env file to handle Windows edge cases that dotenvy misses
fn load_env_file(path: &str) -> bool {
    let content = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(_) => return false,
    };

    // Skip BOM if present (UTF-8 BOM is EF BB BF)
    let content = if content.starts_with(&[0xEF, 0xBB, 0xBF]) {
        &content[3..]
    } else {
        &content[..]
    };

    // Convert to string
    let text = match String::from_utf8(content.to_vec()) {
        Ok(s) => s,
        Err(_) => return false,
    };

    for line in text.lines() {
        let line = line.trim();

        // Skip comments and empty lines
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        // Split on first '='
        if let Some(eq_pos) = line.find('=') {
            let key = line[..eq_pos].trim();
            let mut value = line[eq_pos + 1..].trim();

            // Remove surrounding quotes if present
            if (value.starts_with('"') && value.ends_with('"'))
                || (value.starts_with('\'') && value.ends_with('\''))
            {
                value = &value[1..value.len() - 1];
            }

            // Set environment variable
            if !key.is_empty() {
                std::env::set_var(key, value);
            }
        }
    }

    true
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env file - try multiple locations with our robust parser
    let env_paths = [
        ".env",
        "../.env",
        "../../.env",  // When running from target/debug
        "../../../.env",
    ];

    let mut loaded = false;
    for path in &env_paths {
        if load_env_file(path) {
            loaded = true;
            break;
        }
    }

    // Silently continue if no .env found - API key may come from settings
    let _ = loaded;

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
            commands::get_known_folders,
            commands::count_files_in_directories,
            commands::count_duplicates,
            commands::check_ai_config,
            commands::classify_files,
            commands::get_classification_estimate,
            commands::scan_directories,
            commands::get_scan_status,
            commands::search_files,
            commands::get_file_details,
            commands::generate_organization_plan,
            commands::execute_plan,
            commands::undo_last_operation,
            commands::get_settings,
            commands::save_settings,
            commands::test_api_connection,
            commands::increment_scan_count,
            commands::get_scan_count,
            // Activity Log commands (per doc 07)
            commands::start_organization_session,
            commands::complete_organization_session,
            commands::log_file_operation,
            commands::update_operation_status,
            commands::get_recent_sessions,
            commands::get_session_log,
            commands::undo_session_operation,
            commands::undo_entire_session,
            commands::check_incomplete_sessions,
            commands::export_session_log,
            commands::cleanup_old_sessions,
            // Crash Recovery commands (per doc 07)
            commands::get_incomplete_session_details,
            commands::resume_incomplete_session,
            commands::rollback_incomplete_session,
            commands::discard_incomplete_session,
            // Screen 5-7 commands (per doc 04)
            commands::get_category_breakdown,
            commands::get_files_by_category,
            commands::get_clarification_questions,
            commands::apply_clarification_answer,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
