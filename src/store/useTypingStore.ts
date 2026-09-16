import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  Category,
  CodeLanguage,
  Difficulty,
  Progress,
  SessionMode,
  SessionPhase,
  TextItem,
} from "../types";
import { DEFAULT_SETTINGS } from "../types";
import { calculateAccuracy, calculateWpm } from "../utils/wpmCalculator";
import { charsMatch } from "../utils/rtlCompare";
import { playErrorSound } from "../utils/sound";

const AUTOSAVE_INTERVAL_MS = 3000;

const DIFFICULTY_ORDER: Difficulty[] = ["beginner", "intermediate", "advanced"];

function suggestNextDifficulty(current: Difficulty, accuracy: number): Difficulty | null {
  const index = DIFFICULTY_ORDER.indexOf(current);
  if (index < 0) return null;
  if (accuracy >= 95 && index < DIFFICULTY_ORDER.length - 1) {
    return DIFFICULTY_ORDER[index + 1];
  }
  if (accuracy < 80 && index > 0) {
    return DIFFICULTY_ORDER[index - 1];
  }
  return null;
}

interface TypingState {
  // ----- selection / config -----
  category: Category;
  language: CodeLanguage | null;
  difficulty: Difficulty;
  mode: SessionMode;
  durationSecs: number;

  // ----- session -----
  sessionId: string;
  phase: SessionPhase;
  currentText: string;
  typedChars: string[]; // what the user has typed so far, one entry per char
  correctCount: number;   // correct chars in the CURRENT typed array (drops if user backspaces a fix away)
  incorrectCount: number; // wrong chars still standing in the CURRENT typed array (same caveat)
  totalErrors: number;    // every mistaken keystroke ever made this session -- never decreases,
                           // even if the user backspaces and fixes it. This is "how many errors
                           // did the user have", independent of whether they cleaned them up after.
  elapsedMs: number;
  seenTextIds: number[]; // recent ids served, for endless-mode no-repeat
  lastPracticeText: string | null;

  // ----- derived stats (recomputed on tick/finish) -----
  wpm: number;
  accuracy: number;

  // ----- lifecycle -----
  autosaveHandle: ReturnType<typeof setInterval> | null;
  errorMessage: string | null;
  pendingResume: Progress | null;
  suggestedDifficulty: Difficulty | null;
  settings: AppSettings;
  settingsOpen: boolean;
  customText: string;

  setSelection: (partial: Partial<{
    category: Category;
    language: CodeLanguage | null;
    difficulty: Difficulty;
    mode: SessionMode;
    durationSecs: number;
  }>) => void;

  setCustomText: (text: string) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => void;
  setSettingsOpen: (open: boolean) => void;

  startSession: () => Promise<void>;
  startPracticeAgain: () => void;
  checkForResume: () => Promise<void>;
  acceptResume: () => void;
  dismissResume: () => Promise<void>;
  clearDifficultySuggestion: () => void;
  typeChar: (ch: string) => void;
  removeLastChar: () => void;
  tick: (deltaMs: number) => void;
  pause: () => void;
  resume: () => void;
  finish: () => Promise<void>;
  reset: () => void;
}

function newSessionId(): string {
  // Good enough for a local, non-networked identifier.
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function startAutosave(get: () => TypingState, set: (partial: Partial<TypingState>) => void) {
  const existing = get().autosaveHandle;
  if (existing) clearInterval(existing);
  const handle = setInterval(() => {
    const s = get();
    if (s.phase !== "running") return;
    const remaining = s.currentText.slice(s.typedChars.length);
    invoke("save_progress", {
      sessionId: s.sessionId,
      remainingText: remaining,
      elapsedMs: s.elapsedMs,
      category: s.category,
      language: s.language,
      difficulty: s.difficulty,
      mode: s.mode,
      durationSecs: s.durationSecs,
    }).catch(() => {
      // Autosave failures should never interrupt typing.
    });
  }, AUTOSAVE_INTERVAL_MS);
  set({ autosaveHandle: handle });
}

export const useTypingStore = create<TypingState>((set, get) => ({
  category: "english",
  language: null,
  difficulty: "beginner",
  mode: "timed",
  durationSecs: 60,

  sessionId: newSessionId(),
  phase: "idle",
  currentText: "",
  typedChars: [],
  correctCount: 0,
  incorrectCount: 0,
  totalErrors: 0,
  elapsedMs: 0,
  seenTextIds: [],
  lastPracticeText: null,

  wpm: 0,
  accuracy: 100,

  autosaveHandle: null,
  errorMessage: null,
  pendingResume: null,
  suggestedDifficulty: null,
  settings: { ...DEFAULT_SETTINGS },
  settingsOpen: false,
  customText: "",

  setSelection: (partial) => set(partial),

  setCustomText: (text) => set({ customText: text }),

  setSettingsOpen: (open) => set({ settingsOpen: open }),

  loadSettings: async () => {
    try {
      const raw = await invoke<Record<string, string>>("get_settings");
      set({
        settings: {
          fontSizePx: Number(raw.fontSizePx ?? DEFAULT_SETTINGS.fontSizePx),
          soundEnabled: (raw.soundEnabled ?? String(DEFAULT_SETTINGS.soundEnabled)) === "true",
          caseSensitive: (raw.caseSensitive ?? String(DEFAULT_SETTINGS.caseSensitive)) !== "false",
          caretStyle: raw.caretStyle === "block" ? "block" : "underline",
        },
      });
    } catch {
      // keep defaults
    }
  },

  updateSettings: (partial) => {
    const next = { ...get().settings, ...partial };
    set({ settings: next });
    const entries: [string, string][] = [
      ["fontSizePx", String(next.fontSizePx)],
      ["soundEnabled", String(next.soundEnabled)],
      ["caseSensitive", String(next.caseSensitive)],
      ["caretStyle", next.caretStyle],
    ];
    for (const [key, value] of entries) {
      invoke("set_setting", { key, value }).catch(() => {});
    }
  },

  clearDifficultySuggestion: () => set({ suggestedDifficulty: null }),

  startSession: async () => {
    const { category, language, difficulty, mode, customText } = get();

    if (category === "custom") {
      const body = customText.trim();
      if (!body) {
        set({ errorMessage: "برای متن سفارشی، ابتدا متن را وارد کنید." });
        return;
      }
      set({
        sessionId: newSessionId(),
        phase: "running",
        currentText: body,
        typedChars: [],
        correctCount: 0,
        incorrectCount: 0,
        totalErrors: 0,
        elapsedMs: 0,
        seenTextIds: [],
        lastPracticeText: mode === "practice" ? body : null,
        wpm: 0,
        accuracy: 100,
        errorMessage: null,
        pendingResume: null,
      });
      startAutosave(get, set);
      return;
    }

    try {
      const item = await invoke<TextItem>("get_text", {
        category,
        language,
        difficulty,
      });

      const sessionId = newSessionId();
      set({
        sessionId,
        phase: "running",
        currentText: item.body,
        typedChars: [],
        correctCount: 0,
        incorrectCount: 0,
        totalErrors: 0,
        elapsedMs: 0,
        seenTextIds: item.id >= 0 ? [item.id] : [],
        lastPracticeText: mode === "practice" ? item.body : null,
        wpm: 0,
        accuracy: 100,
        errorMessage: null,
        pendingResume: null,
      });

      startAutosave(get, set);
    } catch (err) {
      const fallback =
        "متن تمرین الان در دسترس نیست؛ این متن جایگزین برای ادامه جلسه استفاده می‌شود.";
      set({
        sessionId: newSessionId(),
        phase: "running",
        currentText: fallback,
        typedChars: [],
        correctCount: 0,
        incorrectCount: 0,
        totalErrors: 0,
        elapsedMs: 0,
        lastPracticeText: mode === "practice" ? fallback : null,
        errorMessage: `بارگذاری متن ناموفق بود؛ با متن جایگزین ادامه می‌دهیم. (${String(err)})`,
      });
      startAutosave(get, set);
    }
  },

  startPracticeAgain: () => {
    const text = get().lastPracticeText;
    if (!text) return;
    set({
      sessionId: newSessionId(),
      phase: "running",
      currentText: text,
      typedChars: [],
      correctCount: 0,
      incorrectCount: 0,
      totalErrors: 0,
      elapsedMs: 0,
      wpm: 0,
      accuracy: 100,
      errorMessage: null,
      mode: "practice",
    });
    startAutosave(get, set);
  },

  checkForResume: async () => {
    try {
      const progress = await invoke<Progress | null>("load_latest_progress");
      if (!progress || !progress.remaining_text.trim()) {
        set({ pendingResume: null });
        return;
      }
      set({ pendingResume: progress });
    } catch {
      set({ pendingResume: null });
    }
  },

  acceptResume: () => {
    const progress = get().pendingResume;
    if (!progress) return;

    set({
      sessionId: progress.session_id,
      category: progress.category,
      language: progress.language,
      difficulty: progress.difficulty,
      mode: progress.mode,
      durationSecs: progress.duration_secs,
      currentText: progress.remaining_text,
      typedChars: [],
      correctCount: 0,
      incorrectCount: 0,
      totalErrors: 0,
      elapsedMs: progress.elapsed_ms,
      seenTextIds: [],
      lastPracticeText: progress.mode === "practice" ? progress.remaining_text : null,
      wpm: 0,
      accuracy: 100,
      phase: "running",
      pendingResume: null,
      errorMessage: null,
    });
    startAutosave(get, set);
  },

  dismissResume: async () => {
    const progress = get().pendingResume;
    set({ pendingResume: null });
    try {
      await invoke("clear_progress", {
        sessionId: progress?.session_id ?? null,
      });
    } catch {
      // ignore dismiss failures
    }
  },

  typeChar: (ch: string) => {
    const {
      currentText,
      typedChars,
      correctCount,
      incorrectCount,
      totalErrors,
      mode,
      seenTextIds,
      category,
      language,
      difficulty,
    } = get();
    const index = typedChars.length;
    if (index >= currentText.length) return;

    const expected = currentText[index];
    const caseSensitive = get().settings.caseSensitive;
    const isCorrect = charsMatch(expected, ch, caseSensitive);

    const nextTyped = [...typedChars, ch];
    const nextCorrect = correctCount + (isCorrect ? 1 : 0);
    const nextIncorrect = incorrectCount + (isCorrect ? 0 : 1);
    const nextTotalErrors = totalErrors + (isCorrect ? 0 : 1);

    if (!isCorrect && get().settings.soundEnabled) {
      playErrorSound();
    }

    set({
      typedChars: nextTyped,
      correctCount: nextCorrect,
      incorrectCount: nextIncorrect,
      totalErrors: nextTotalErrors,
      wpm: calculateWpm(nextCorrect, get().elapsedMs),
      accuracy: calculateAccuracy(nextCorrect, nextCorrect + nextTotalErrors),
    });

    if (nextTyped.length >= currentText.length) {
      if (mode === "endless") {
        invoke<TextItem>("get_endless_chunk", {
          category,
          language,
          difficulty,
          excludeIds: seenTextIds.slice(-20),
        })
          .then((item) => {
            set((s) => ({
              currentText: s.currentText + " " + item.body,
              seenTextIds: item.id >= 0 ? [...s.seenTextIds, item.id] : s.seenTextIds,
            }));
          })
          .catch(() => {
            // keep current text if fetch fails
          });
      } else if (mode === "practice") {
        // Practice does not auto-finish when text ends; user ends via controls.
        return;
      } else {
        get().finish();
      }
    }
  },

  removeLastChar: () => {
    const { typedChars, currentText, correctCount, incorrectCount, totalErrors } = get();
    if (typedChars.length === 0) return;
    const removedIndex = typedChars.length - 1;
    const removedChar = typedChars[removedIndex];
    const wasCorrect = charsMatch(
      currentText[removedIndex],
      removedChar,
      get().settings.caseSensitive,
    );

    const nextTyped = typedChars.slice(0, -1);
    const nextCorrect = Math.max(0, correctCount - (wasCorrect ? 1 : 0));
    const nextIncorrect = Math.max(0, incorrectCount - (wasCorrect ? 0 : 1));

    set({
      typedChars: nextTyped,
      correctCount: nextCorrect,
      incorrectCount: nextIncorrect,
      accuracy: calculateAccuracy(nextCorrect, nextCorrect + totalErrors),
    });
  },

  tick: (deltaMs: number) => {
    const s = get();
    if (s.phase !== "running") return;
    const elapsedMs = s.elapsedMs + deltaMs;
    set({
      elapsedMs,
      wpm: calculateWpm(s.correctCount, elapsedMs),
    });

    if (s.mode === "timed" && elapsedMs >= s.durationSecs * 1000) {
      get().finish();
    }
  },

  pause: () => set({ phase: "paused" }),
  resume: () => set({ phase: "running" }),

  finish: async () => {
    const s = get();
    if (s.autosaveHandle) clearInterval(s.autosaveHandle);
    const suggestedDifficulty = suggestNextDifficulty(s.difficulty, s.accuracy);
    set({ phase: "finished", autosaveHandle: null, suggestedDifficulty });

    try {
      await invoke("finish_session", {
        sessionId: s.sessionId,
        category: s.category,
        difficulty: s.difficulty,
        wpm: s.wpm,
        accuracy: s.accuracy,
        errors: s.totalErrors,
        durationSecs: Math.round(s.elapsedMs / 1000),
      });
    } catch (err) {
      set({ errorMessage: `ذخیره تاریخچه سشن ممکن نشد: ${String(err)}` });
    }
  },

  reset: () => {
    const s = get();
    if (s.autosaveHandle) clearInterval(s.autosaveHandle);
    set({
      sessionId: newSessionId(),
      phase: "idle",
      currentText: "",
      typedChars: [],
      correctCount: 0,
      incorrectCount: 0,
      totalErrors: 0,
      elapsedMs: 0,
      wpm: 0,
      accuracy: 100,
      autosaveHandle: null,
      errorMessage: null,
      suggestedDifficulty: null,
    });
  },
}));
