import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type {
  Category,
  CodeLanguage,
  Difficulty,
  Progress,
  SessionMode,
  SessionPhase,
  TextItem,
} from "../types";
import { calculateAccuracy, calculateWpm } from "../utils/wpmCalculator";
import { charsMatch } from "../utils/rtlCompare";

const AUTOSAVE_INTERVAL_MS = 3000;

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

  setSelection: (partial: Partial<{
    category: Category;
    language: CodeLanguage | null;
    difficulty: Difficulty;
    mode: SessionMode;
    durationSecs: number;
  }>) => void;

  startSession: () => Promise<void>;
  startPracticeAgain: () => void;
  checkForResume: () => Promise<void>;
  acceptResume: () => void;
  dismissResume: () => Promise<void>;
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

  setSelection: (partial) => set(partial),

  startSession: async () => {
    const { category, language, difficulty, mode } = get();
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
    // charsMatch does NOT lowercase either side -- "A" typed for expected
    // "a" (or vice versa) is a mismatch. Case sensitivity is the default
    // behavior of JS string equality; the only normalization charsMatch
    // applies is for Persian presentation-form lookalikes (see
    // rtlCompare.ts), which never touches Latin letter casing.
    const isCorrect = charsMatch(expected, ch);

    const nextTyped = [...typedChars, ch];
    const nextCorrect = correctCount + (isCorrect ? 1 : 0);
    const nextIncorrect = incorrectCount + (isCorrect ? 0 : 1);
    const nextTotalErrors = totalErrors + (isCorrect ? 0 : 1);

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
    const wasCorrect = charsMatch(currentText[removedIndex], removedChar);

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
    set({ phase: "finished", autosaveHandle: null });

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
    });
  },
}));
