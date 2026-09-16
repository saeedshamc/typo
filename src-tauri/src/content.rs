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
const SEED_CODE_TS: &str = include_str!("../seed/code_typescript.json");
const SEED_CODE_PY: &str = include_str!("../seed/code_python.json");
const SEED_CODE_CPP: &str = include_str!("../seed/code_cpp.json");
const SEED_CODE_RUST: &str = include_str!("../seed/code_rust.json");
const SEED_CODE_PHP: &str = include_str!("../seed/code_php.json");
const SEED_CODE_KOTLIN: &str = include_str!("../seed/code_kotlin.json");
const SEED_CODE_GO: &str = include_str!("../seed/code_go.json");
const SEED_CODE_JAVA: &str = include_str!("../seed/code_java.json");
const SEED_CODE_CS: &str = include_str!("../seed/code_csharp.json");
const SEED_CODE_RUBY: &str = include_str!("../seed/code_ruby.json");
const SEED_CODE_SWIFT: &str = include_str!("../seed/code_swift.json");
const SEED_CODE_SQL: &str = include_str!("../seed/code_sql.json");

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

/// Inserts any seed rows that are not already present (matched by body).
/// Safe to call on every startup so expanding the seed bank upgrades
/// existing installs without wiping user history.
pub fn seed_if_empty(conn: &Connection) -> rusqlite::Result<()> {
    let all_seed = [
        SEED_PERSIAN,
        SEED_ENGLISH,
        SEED_CODE_JS,
        SEED_CODE_TS,
        SEED_CODE_PY,
        SEED_CODE_CPP,
        SEED_CODE_RUST,
        SEED_CODE_PHP,
        SEED_CODE_KOTLIN,
        SEED_CODE_GO,
        SEED_CODE_JAVA,
        SEED_CODE_CS,
        SEED_CODE_RUBY,
        SEED_CODE_SWIFT,
        SEED_CODE_SQL,
    ];
    let tx = conn.unchecked_transaction()?;
    for raw in all_seed {
        let items: Vec<SeedItem> = serde_json::from_str(raw).unwrap_or_default();
        for item in items {
            let density = symbol_density(&item.body);
            tx.execute(
                "INSERT INTO texts (category, language, difficulty, symbol_density, body)
                 SELECT ?1, ?2, ?3, ?4, ?5
                 WHERE NOT EXISTS (SELECT 1 FROM texts WHERE body = ?5)",
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
    // Prefer texts whose symbol_density sits near the band for the chosen
    // difficulty, then fall back to a random matching row.
    let target_density = match difficulty {
        "beginner" => 0.05,
        "intermediate" => 0.12,
        _ => 0.22,
    };

    let query = format!(
        "SELECT {SELECT_COLS} FROM texts
         WHERE category = ?1 AND difficulty = ?2
           AND (?3 IS NULL OR language = ?3)
         ORDER BY ABS(symbol_density - ?4), RANDOM()
         LIMIT 1"
    );
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let item = stmt
        .query_row(
            params![category, difficulty, language, target_density],
            row_to_item,
        )
        .optional()
        .map_err(|e| e.to_string())?;

    match item {
        Some(item) => Ok(item),
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
        None => Ok(generate_procedural(category, language, difficulty)),
    }
}

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
        id: -1,
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

const CODE_SNIPPETS_CPP: [&str; 4] = [
    "auto total = std::accumulate(items.begin(), items.end(), 0);",
    "if (ptr != nullptr) { process(*ptr); }",
    "std::vector<int> values = {1, 2, 3, 4};",
    "for (const auto& item : items) { handle(item); }",
];

const CODE_SNIPPETS_RUST: [&str; 4] = [
    "let total: i32 = items.iter().sum();",
    "if let Some(user) = find_user(id) { greet(&user); }",
    "let values = vec![1, 2, 3, 4];",
    "match result { Ok(v) => use_value(v), Err(e) => log(e) }",
];

const CODE_SNIPPETS_PHP: [&str; 4] = [
    "$total = array_sum(array_column($items, 'value'));",
    "if ($user !== null) { grantAccess($user['id']); }",
    "$values = array_map(fn($n) => $n * 2, $numbers);",
    "try { process($data); } catch (Throwable $e) { log($e); }",
];

const CODE_SNIPPETS_KOTLIN: [&str; 4] = [
    "val total = items.sumOf { it.value }",
    "user?.let { grantAccess(it.id) }",
    "val values = numbers.map { it * 2 }",
    "runCatching { process(data) }.onFailure { log(it) }",
];

const CODE_SNIPPETS_TS: [&str; 4] = [
    "type User = { id: number; name: string };",
    "const total: number = values.reduce((sum, n) => sum + n, 0);",
    "async function load(): Promise<void> { await fetch(url); }",
    "export function assertNever(x: never): never { throw new Error('unexpected'); }",
];

const CODE_SNIPPETS_GO: [&str; 4] = [
    "func add(a, b int) int { return a + b }",
    "for _, item := range items { handle(item) }",
    "if err != nil { return err }",
    "go worker(ctx, jobs, results)",
];

const CODE_SNIPPETS_JAVA: [&str; 4] = [
    "var total = items.stream().mapToInt(Item::value).sum();",
    "Optional.ofNullable(user).ifPresent(this::greet);",
    "record Point(int x, int y) {}",
    "List.of(1, 2, 3).forEach(System.out::println);",
];

const CODE_SNIPPETS_CS: [&str; 4] = [
    "var total = items.Sum(x => x.Value);",
    "if (user is not null) GrantAccess(user.Id);",
    "public record Page<T>(IReadOnlyList<T> Items, bool HasNext);",
    "await foreach (var item in source) { Process(item); }",
];

const CODE_SNIPPETS_RUBY: [&str; 4] = [
    "total = items.sum(&:value)",
    "users.select(&:active?).each { |u| greet(u) }",
    "result = data.transform_values(&:upcase)",
    "raise ArgumentError, 'blank' if value.nil? || value.empty?",
];

const CODE_SNIPPETS_SWIFT: [&str; 4] = [
    "let total = items.reduce(0) { $0 + $1.value }",
    "guard let user else { return }",
    "Task { await refresh() }",
    "enum State { case idle, loading, ready }",
];

const CODE_SNIPPETS_SQL: [&str; 4] = [
    "SELECT id, name FROM users WHERE active = 1;",
    "UPDATE sessions SET wpm = 80 WHERE id = 12;",
    "CREATE INDEX idx_users_email ON users(email);",
    "WITH ranked AS (SELECT * FROM sessions) SELECT * FROM ranked;",
];

fn generate_procedural_code(language: &str, word_count: usize, rng: &mut impl Rng) -> String {
    let pool: &[&str] = match language {
        "python" => &CODE_SNIPPETS_PY,
        "typescript" => &CODE_SNIPPETS_TS,
        "cpp" => &CODE_SNIPPETS_CPP,
        "rust" => &CODE_SNIPPETS_RUST,
        "php" => &CODE_SNIPPETS_PHP,
        "kotlin" => &CODE_SNIPPETS_KOTLIN,
        "go" => &CODE_SNIPPETS_GO,
        "java" => &CODE_SNIPPETS_JAVA,
        "csharp" => &CODE_SNIPPETS_CS,
        "ruby" => &CODE_SNIPPETS_RUBY,
        "swift" => &CODE_SNIPPETS_SWIFT,
        "sql" => &CODE_SNIPPETS_SQL,
        _ => &CODE_SNIPPETS_JS,
    };
    let snippet_count = (word_count / 15).max(2);
    let mut lines = Vec::with_capacity(snippet_count);
    for _ in 0..snippet_count {
        lines.push(*pool.choose(rng).unwrap());
    }
    lines.join("\n")
}
