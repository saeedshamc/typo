use rand::seq::SliceRandom;
use rand::Rng;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct TextItem {
    pub id: i64,
    pub category: String,
    pub language: Option<String>,
    pub difficulty: String,
    pub symbol_density: f64,
    pub body: String,
}

#[derive(Deserialize)]
struct SeedItem {
    category: String,
    language: Option<String>,
    difficulty: String,
    body: String,
}

// Seed content embedded at compile time -> the app has real text even on
// first run, fully offline, no network dependency for the content bank.
const SEED_PERSIAN: &str = include_str!("../seed/persian.json");
const SEED_ENGLISH: &str = include_str!("../seed/english.json");
const SEED_CODE_JS: &str = include_str!("../seed/code_javascript.json");
const SEED_CODE_PY: &str = include_str!("../seed/code_python.json");

/// Rough symbol-density score used for auto-leveling: fraction of
/// non-alphanumeric, non-whitespace characters. Code with lots of
/// `{}();=>` scores higher than plain prose.
fn symbol_density(text: &str) -> f64 {
    let total = text.chars().count().max(1);
    let symbols = text
        .chars()
        .filter(|c| !c.is_alphanumeric() && !c.is_whitespace())
        .count();
    symbols as f64 / total as f64
}

pub fn seed_if_empty(conn: &Connection) -> rusqlite::Result<()> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM texts", [], |r| r.get(0))?;
    if count > 0 {
        return Ok(());
    }

    let all_seed = [SEED_PERSIAN, SEED_ENGLISH, SEED_CODE_JS, SEED_CODE_PY];
    let tx = conn.unchecked_transaction()?;
    for raw in all_seed {
        let items: Vec<SeedItem> = serde_json::from_str(raw).unwrap_or_default();
        for item in items {
            let density = symbol_density(&item.body);
            tx.execute(
                "INSERT INTO texts (category, language, difficulty, symbol_density, body)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![item.category, item.language, item.difficulty, density, item.body],
            )?;
        }
    }
    tx.commit()?;
    Ok(())
}

fn row_to_item(row: &rusqlite::Row) -> rusqlite::Result<TextItem> {
    Ok(TextItem {
        id: row.get(0)?,
        category: row.get(1)?,
        language: row.get(2)?,
        difficulty: row.get(3)?,
        symbol_density: row.get(4)?,
        body: row.get(5)?,
    })
}

const SELECT_COLS: &str = "id, category, language, difficulty, symbol_density, body";

pub fn get_text(
    conn: &Connection,
    category: &str,
    language: Option<&str>,
    difficulty: &str,
) -> Result<TextItem, String> {
    let query = format!(
        "SELECT {SELECT_COLS} FROM texts
         WHERE category = ?1 AND difficulty = ?2
           AND (?3 IS NULL OR language = ?3)
         ORDER BY RANDOM() LIMIT 1"
    );
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let item = stmt
        .query_row(params![category, difficulty, language], row_to_item)
        .optional()
        .map_err(|e| e.to_string())?;

    match item {
        Some(item) => Ok(item),
        // Bank has nothing matching -> never leave the user with no text,
        // fall back to procedural generation instead of erroring out.
        None => Ok(generate_procedural(category, language, difficulty)),
    }
}

pub fn get_endless_chunk(
    conn: &Connection,
    category: &str,
    language: Option<&str>,
    difficulty: &str,
    exclude_ids: &[i64],
) -> Result<TextItem, String> {
    let placeholders = if exclude_ids.is_empty() {
        "(-1)".to_string()
    } else {
        exclude_ids
            .iter()
            .map(|id| id.to_string())
            .collect::<Vec<_>>()
            .join(",")
    };

    let query = format!(
        "SELECT {SELECT_COLS} FROM texts
         WHERE category = ?1 AND difficulty = ?2
           AND (?3 IS NULL OR language = ?3)
           AND id NOT IN {placeholders}
         ORDER BY RANDOM() LIMIT 1"
    );
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let item = stmt
        .query_row(params![category, difficulty, language], row_to_item)
        .optional()
        .map_err(|e| e.to_string())?;

    match item {
        Some(item) => Ok(item),
        None => {
            // Every non-excluded row exhausted (or bank empty) -> either
            // recycle the oldest-excluded ids or generate procedurally.
            // Procedural generation is the simpler guarantee, so we lean
            // on it here: endless mode literally cannot run dry.
            Ok(generate_procedural(category, language, difficulty))
        }
    }
}

/// Fallback generator: builds a chunk of text from small word/token pools
/// so the app can produce plausible practice text even with an empty or
/// exhausted database. Not meant to rival curated content -- just a safety
/// net so "ran out of text" is structurally impossible.
fn generate_procedural(category: &str, language: Option<&str>, difficulty: &str) -> TextItem {
    let mut rng = rand::thread_rng();

    let word_count = match difficulty {
        "beginner" => 25,
        "intermediate" => 45,
        _ => 70,
    };

    let body = match category {
        "code" => generate_procedural_code(language.unwrap_or("javascript"), word_count, &mut rng),
        "persian" => generate_procedural_prose(&PERSIAN_WORDS, word_count, &mut rng),
        _ => generate_procedural_prose(&ENGLISH_WORDS, word_count, &mut rng),
    };

    TextItem {
        id: -1, // negative id marks "procedurally generated, not a DB row"
        category: category.to_string(),
        language: language.map(|s| s.to_string()),
        difficulty: difficulty.to_string(),
        symbol_density: symbol_density(&body),
        body,
    }
}

const ENGLISH_WORDS: [&str; 20] = [
    "system", "function", "value", "process", "design", "quick", "practice",
    "letter", "signal", "output", "input", "record", "measure", "steady",
    "focus", "rhythm", "pattern", "control", "logic", "structure",
];

const PERSIAN_WORDS: [&str; 20] = [
    "سیستم", "تابع", "مقدار", "فرآیند", "طراحی", "سریع", "تمرین",
    "حرف", "سیگنال", "خروجی", "ورودی", "رکورد", "اندازه", "پایدار",
    "تمرکز", "ریتم", "الگو", "کنترل", "منطق", "ساختار",
];

fn generate_procedural_prose(pool: &[&str], word_count: usize, rng: &mut impl Rng) -> String {
    let mut words = Vec::with_capacity(word_count);
    for _ in 0..word_count {
        words.push(*pool.choose(rng).unwrap());
    }
    words.join(" ")
}

const CODE_SNIPPETS_JS: [&str; 6] = [
    "const total = items.reduce((sum, x) => sum + x.value, 0);",
    "function isValid(input) { return input !== null && input.length > 0; }",
    "export const config = { retries: 3, timeout: 5000 };",
    "if (user && user.role === 'admin') { grantAccess(user.id); }",
    "const result = await fetch(url).then(res => res.json());",
    "class Session { constructor(id) { this.id = id; this.startedAt = Date.now(); } }",
];

const CODE_SNIPPETS_PY: [&str; 6] = [
    "def is_valid(value):\n    return value is not None and len(value) > 0",
    "total = sum(item.value for item in items)",
    "class Session:\n    def __init__(self, session_id):\n        self.id = session_id",
    "with open(path, 'r') as f:\n    data = f.read()",
    "result = [x for x in values if x % 2 == 0]",
    "try:\n    process(data)\nexcept ValueError as e:\n    log(e)",
];

fn generate_procedural_code(language: &str, word_count: usize, rng: &mut impl Rng) -> String {
    let pool: &[&str] = match language {
        "python" => &CODE_SNIPPETS_PY,
        _ => &CODE_SNIPPETS_JS,
    };
    // Roughly scale number of snippets to requested "word_count" difficulty knob.
    let snippet_count = (word_count / 15).max(2);
    let mut lines = Vec::with_capacity(snippet_count);
    for _ in 0..snippet_count {
        lines.push(*pool.choose(rng).unwrap());
    }
    lines.join("\n")
}
