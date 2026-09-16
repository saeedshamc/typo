use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::path::Path;

pub fn open_and_migrate(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;

    // WAL = faster + more crash-resistant writes (autosave hits this often).
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;

    conn.execute_batch(
        r#"
        CREATE TABLE IF NOT EXISTS texts (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            category        TEXT NOT NULL,      -- 'persian' | 'english' | 'code'
            language        TEXT,               -- e.g. 'javascript', 'python' (code only)
            difficulty      TEXT NOT NULL,       -- 'beginner' | 'intermediate' | 'advanced'
            symbol_density  REAL NOT NULL,       -- 0.0 - 1.0, used for auto-leveling
            body            TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_texts_filter
            ON texts (category, difficulty, language);

        CREATE TABLE IF NOT EXISTS sessions (
            id              TEXT PRIMARY KEY,   -- uuid generated client-side
            category        TEXT NOT NULL,
            difficulty      TEXT NOT NULL,
            wpm             REAL,
            accuracy        REAL,
            errors          INTEGER,            -- total mistakes made, including later-fixed ones
            duration_secs   INTEGER,
            finished_at     TEXT
        );

        -- One row per in-progress session, overwritten on every autosave tick.
        -- This is what makes crash recovery possible: on relaunch the
        -- frontend loads the latest progress row before starting fresh.
        CREATE TABLE IF NOT EXISTS progress (
            session_id      TEXT PRIMARY KEY,
            remaining_text  TEXT NOT NULL,
            elapsed_ms      INTEGER NOT NULL,
            category        TEXT NOT NULL DEFAULT 'english',
            language        TEXT,
            difficulty      TEXT NOT NULL DEFAULT 'beginner',
            mode            TEXT NOT NULL DEFAULT 'timed',
            duration_secs   INTEGER NOT NULL DEFAULT 60,
            updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
        );
        "#,
    )?;

    migrate_progress_columns(&conn)?;

    Ok(conn)
}

fn migrate_progress_columns(conn: &Connection) -> rusqlite::Result<()> {
    let mut stmt = conn.prepare("PRAGMA table_info(progress)")?;
    let existing: Vec<String> = stmt
        .query_map([], |row| row.get::<_, String>(1))?
        .filter_map(|r| r.ok())
        .collect();

    let additions = [
        ("category", "TEXT NOT NULL DEFAULT 'english'"),
        ("language", "TEXT"),
        ("difficulty", "TEXT NOT NULL DEFAULT 'beginner'"),
        ("mode", "TEXT NOT NULL DEFAULT 'timed'"),
        ("duration_secs", "INTEGER NOT NULL DEFAULT 60"),
    ];

    for (name, decl) in additions {
        if !existing.iter().any(|c| c == name) {
            conn.execute(
                &format!("ALTER TABLE progress ADD COLUMN {name} {decl}"),
                [],
            )?;
        }
    }

    Ok(())
}

pub fn save_progress(
    conn: &Connection,
    session_id: &str,
    remaining_text: &str,
    elapsed_ms: i64,
    category: &str,
    language: Option<&str>,
    difficulty: &str,
    mode: &str,
    duration_secs: i64,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO progress (
            session_id, remaining_text, elapsed_ms,
            category, language, difficulty, mode, duration_secs, updated_at
         )
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))
         ON CONFLICT(session_id) DO UPDATE SET
            remaining_text = excluded.remaining_text,
            elapsed_ms     = excluded.elapsed_ms,
            category       = excluded.category,
            language       = excluded.language,
            difficulty     = excluded.difficulty,
            mode           = excluded.mode,
            duration_secs  = excluded.duration_secs,
            updated_at     = excluded.updated_at",
        params![
            session_id,
            remaining_text,
            elapsed_ms,
            category,
            language,
            difficulty,
            mode,
            duration_secs
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
pub struct Progress {
    pub session_id: String,
    pub remaining_text: String,
    pub elapsed_ms: i64,
    pub category: String,
    pub language: Option<String>,
    pub difficulty: String,
    pub mode: String,
    pub duration_secs: i64,
    pub updated_at: String,
}

pub fn load_progress(conn: &Connection, session_id: &str) -> Result<Option<Progress>, String> {
    conn.query_row(
        "SELECT session_id, remaining_text, elapsed_ms, category, language,
                difficulty, mode, duration_secs, updated_at
         FROM progress WHERE session_id = ?1",
        params![session_id],
        map_progress_row,
    )
    .optional()
    .map_err(|e| e.to_string())
}

pub fn load_latest_progress(conn: &Connection) -> Result<Option<Progress>, String> {
    conn.query_row(
        "SELECT session_id, remaining_text, elapsed_ms, category, language,
                difficulty, mode, duration_secs, updated_at
         FROM progress
         ORDER BY updated_at DESC
         LIMIT 1",
        [],
        map_progress_row,
    )
    .optional()
    .map_err(|e| e.to_string())
}

fn map_progress_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Progress> {
    Ok(Progress {
        session_id: row.get(0)?,
        remaining_text: row.get(1)?,
        elapsed_ms: row.get(2)?,
        category: row.get(3)?,
        language: row.get(4)?,
        difficulty: row.get(5)?,
        mode: row.get(6)?,
        duration_secs: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

pub fn clear_progress(conn: &Connection, session_id: Option<&str>) -> Result<(), String> {
    if let Some(id) = session_id {
        conn.execute("DELETE FROM progress WHERE session_id = ?1", params![id])
            .map_err(|e| e.to_string())?;
    } else {
        conn.execute("DELETE FROM progress", [])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn finish_session(
    conn: &Connection,
    session_id: &str,
    category: &str,
    difficulty: &str,
    wpm: f64,
    accuracy: f64,
    errors: i64,
    duration_secs: i64,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO sessions (id, category, difficulty, wpm, accuracy, errors, duration_secs, finished_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
            wpm = excluded.wpm, accuracy = excluded.accuracy, errors = excluded.errors,
            duration_secs = excluded.duration_secs, finished_at = excluded.finished_at",
        params![session_id, category, difficulty, wpm, accuracy, errors, duration_secs],
    )
    .map_err(|e| e.to_string())?;

    // Session is done -> its recovery row is no longer needed.
    conn.execute(
        "DELETE FROM progress WHERE session_id = ?1",
        params![session_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Serialize)]
pub struct SessionRecord {
    pub id: String,
    pub category: String,
    pub difficulty: String,
    pub wpm: Option<f64>,
    pub accuracy: Option<f64>,
    pub errors: Option<i64>,
    pub duration_secs: Option<i64>,
    pub finished_at: Option<String>,
}

pub fn get_history(conn: &Connection, limit: i64) -> Result<Vec<SessionRecord>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, category, difficulty, wpm, accuracy, errors, duration_secs, finished_at
             FROM sessions ORDER BY finished_at DESC LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(SessionRecord {
                id: row.get(0)?,
                category: row.get(1)?,
                difficulty: row.get(2)?,
                wpm: row.get(3)?,
                accuracy: row.get(4)?,
                errors: row.get(5)?,
                duration_secs: row.get(6)?,
                finished_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}
