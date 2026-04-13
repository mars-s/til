// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod auth;
mod commands;
mod state;

use state::AppState;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|_app| {
            // Deep-link scheme (til://) is registered via the app bundle on macOS.
            // On Windows/Linux only, runtime registration is needed.
            #[cfg(any(target_os = "windows", target_os = "linux"))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                _app.deep_link().register("til").ok();
            }
            Ok(())
        })
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::get_tasks,
            commands::create_task,
            commands::toggle_task,
            commands::delete_task,
            commands::parse_task,
            commands::parse_calendar,
            commands::get_events,
            commands::create_event,
            commands::get_stored_session,
            commands::save_session,
            commands::clear_session,
            commands::get_supabase_config,
            commands::start_oauth_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
