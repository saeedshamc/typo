export type Category = "persian" | "english" | "code" | "custom";
export type CodeLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "cpp"
  | "rust"
  | "php"
  | "kotlin"
  | "go"
  | "java"
  | "csharp"
  | "ruby"
  | "swift"
  | "sql";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type SessionMode = "timed" | "endless" | "practice";
export type CaretStyle = "underline" | "block";

export interface AppSettings {
  fontSizePx: number;
  soundEnabled: boolean;
  caseSensitive: boolean;
  caretStyle: CaretStyle;
}

export const DEFAULT_SETTINGS: AppSettings = {
  fontSizePx: 22,
  soundEnabled: false,
  caseSensitive: true,
  caretStyle: "underline",
};

export const CODE_LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  cpp: "C++",
  rust: "Rust",
  php: "PHP",
  kotlin: "Kotlin",
  go: "Go",
  java: "Java",
  csharp: "C#",
  ruby: "Ruby",
  swift: "Swift",
  sql: "SQL",
};

export interface TextItem {
  id: number;
  category: Category;
  language: CodeLanguage | null;
  difficulty: Difficulty;
  symbol_density: number;
  body: string;
}

export interface Progress {
  session_id: string;
  remaining_text: string;
  elapsed_ms: number;
  category: Category;
  language: CodeLanguage | null;
  difficulty: Difficulty;
  mode: SessionMode;
  duration_secs: number;
  updated_at: string;
}

export interface SessionRecord {
  id: string;
  category: Category;
  difficulty: Difficulty;
  wpm: number | null;
  accuracy: number | null;
  errors: number | null;
  duration_secs: number | null;
  finished_at: string | null;
}

export type SessionPhase = "idle" | "running" | "paused" | "finished";

export interface TypingSelection {
  category: Category;
  language: CodeLanguage | null;
  difficulty: Difficulty;
  mode: SessionMode;
  durationSecs: number; // used when mode === "timed"
}
