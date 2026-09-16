export type Category = "persian" | "english" | "code" | "custom";
export type CodeLanguage = "javascript" | "python" | "cpp" | "rust" | "php" | "kotlin";
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
