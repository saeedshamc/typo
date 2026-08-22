export type Category = "persian" | "english" | "code";
export type CodeLanguage = "javascript" | "python" | "cpp" | "rust" | "php" | "kotlin";
export type Difficulty = "beginner" | "intermediate" | "advanced";
export type SessionMode = "timed" | "endless" | "practice";

export interface TextItem {
  id: number;
  category: Category;
  language: CodeLanguage | null;
  difficulty: Difficulty;
  symbol_density: number;
  body: string;
}

export interface Progress {
  remaining_text: string;
  elapsed_ms: number;
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
