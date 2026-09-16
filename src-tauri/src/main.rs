// Entry point. Design goals baked into this file:
//
// 1. NEVER let a single failure kill the whole process.
//    Every #[tauri::command] body is wrapped in `catch_unwind` via the
//    `safe_command!` macro below. A panic inside a command becomes an
//    Err(String) sent back to the frontend instead of a process crash.
//
// 2. NEVER run out of text.
//    The content module (content.rs) can always fall back to procedural
//    generation if the SQLite bank is empty or a query returns nothing.
//
// 3. Autosave / crash recovery.
//    Progress is written to SQLite every few seconds from the frontend
//    (see src/store/useTypingStore.ts). If the app is killed, the next
//    launch can call `load_latest_progress` and resume.

mod content;
mod db;

use std::panic::{catch_unwind, AssertUnwindSafe};
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub conn: Mutex<rusqlite::Connection>,
}

/// Wraps a command body so a Rust panic becomes a normal Err(String)
/// returned to the JS side, instead of aborting the process.
macro_rules! safe_command {
    ($body:expr) => {
        match catch_unwind(AssertUnwindSafe(|| $body)) {
            Ok(result) => result,
            Err(_) => Err("internal error (recovered from panic)".to_string()),
        }
    };
}

#[tauri::command]
fn get_text(
    state: State<AppState>,
    category: String,
    language: Option<String>,
    difficulty: String,
) -> Result<content::TextItem, String> {
    safe_command!({
        let conn = state.conn.lock().map_err(|_| "db lock poisoned".to_string())?;
        content::get_text(&conn, &category, language.as_deref(), &difficulty)
    })
}

/// Endless-mode chunk fetch. `exclude_ids` holds recently-served ids so the
/// generator avoids near-term repeats. Falls back to procedural generation
/// if the bank has nothing left matching the filters.
#[tauri::command]
fn get_endless_chunk(
    state: State<AppState>,
    category: String,
    language: Option<String>,
    difficulty: String,
    exclude_ids: Vec<i64>,
) -> Result<content::TextItem, String> {
    safe_command!({
        let conn = state.conn.lock().map_err(|_| "db lock poisoned".to_string())?;
        content::get_endless_chunk(&conn, &category, language.as_deref(), &difficulty, &exclude_ids)
    })
}

#[tauri::command]
fn save_progress(
    state: State<AppState>,
    session_id: String,
    remaining_text: String,
    elapsed_ms: i64,
    category: String,
    language: Option<String>,
    difficulty: String,
    mode: String,
    duration_secs: i64,
) -> Result<(), String> {
    safe_command!({
        let conn = state.conn.lock().map_err(|_| "db lock poisoned".to_string())?;
        db::save_progress(
            &conn,
            &session_id,
            &remaining_text,
            elapsed_ms,
            &category,
            language.as_deref(),
            &difficulty,
            &mode,
            duration_secs,
        )
    })
}

#[tauri::command]
fn load_progress(state: State<AppState>, session_id: String) -> Result<Option<db::Progress>, String> {
    safe_command!({
        let conn = state.conn.lock().map_err(|_| "db lock poisoned".to_string())?;
        db::load_progress(&conn, &session_id)
    })
}

#[tauri::command]
fn load_latest_progress(state: State<AppState>) -> Result<Option<db::Progress>, String> {
    safe_command!({
        let conn = state.conn.lock().map_err(|_| "db lock poisoned".to_string())?;
        db::load_latest_progress(&conn)
    })
}

#[tauri::command]
fn clear_progress(state: State<AppState>, session_id: Option<String>) -> Result<(), String> {
    safe_command!({
        let conn = state.conn.lock().map_err(|_| "db lock poisoned".to_string())?;
        db::clear_progress(&conn, session_id.as_deref())
    })
}

#[tauri::command]
fn finish_session(
    state: State<AppState>,
    session_id: String,
    category: String,
    difficulty: String,
    wpm: f64,
    accuracy: f64,
    errors: i64,
    duration_secs: i64,
) -> Result<(), String> {
    safe_command!({
        let conn = state.conn.lock().map_err(|_| "db lock poisoned".to_string())?;
        db::finish_session(&conn, &session_id, &category, &difficulty, wpm, accuracy, errors, duration_secs)
    })
}

#[tauri::command]
fn get_history(state: State<AppState>, limit: i64) -> Result<Vec<db::SessionRecord>, String> {
    safe_command!({
        let conn = state.conn.lock().map_err(|_| "db lock poisoned".to_string())?;
        db::get_history(&conn, limit)
    })
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .setup(|app| {
            // DB lives in the OS app-data dir, not inside the install dir
            // (so it survives updates/reinstalls) and not in-memory
            // (so autosave actually protects against crashes).
            let app_dir = app
                .path_resolver()
                .app_data_dir()
                .expect("no app data dir resolved");
            std::fs::create_dir_all(&app_dir).ok();
            let db_path = app_dir.join("typingtest.sqlite");

            let conn = db::open_and_migrate(&db_path).expect("failed to open/migrate db");
            content::seed_if_empty(&conn).expect("failed to seed content bank");

            app.manage(AppState {
                conn: Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_text,
            get_endless_chunk,
            save_progress,
            load_progress,
            load_latest_progress,
            clear_progress,
            finish_session,
            get_history
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
