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

  // ----- derived stats (recomputed on tick/finish) -----
  wpm: number;
  accuracy: number;

  // ----- lifecycle -----
  autosaveHandle: ReturnType<typeof setInterval> | null;
  errorMessage: string | null;

  setSelection: (partial: Partial<{
    category: Category;
    language: CodeLanguage | null;
    difficulty: Difficulty;
    mode: SessionMode;
    durationSecs: number;
  }>) => void;

  startSession: () => Promise<void>;
  resumeIfAvailable: () => Promise<boolean>;
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

  wpm: 0,
  accuracy: 100,

  autosaveHandle: null,
  errorMessage: null,

  setSelection: (partial) => set(partial),

  startSession: async () => {
    const { category, language, difficulty } = get();
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
        wpm: 0,
        accuracy: 100,
        errorMessage: null,
      });

      get().autosaveHandle && clearInterval(get().autosaveHandle!);
      const handle = setInterval(() => {
        const s = get();
        if (s.phase !== "running") return;
        const remaining = s.currentText.slice(s.typedChars.length);
        invoke("save_progress", {
          sessionId: s.sessionId,
          remainingText: remaining,
          elapsedMs: s.elapsedMs,
        }).catch(() => {
          // Autosave failures should never interrupt typing; surface
          // nothing to the user, just try again next tick.
        });
      }, AUTOSAVE_INTERVAL_MS);
      set({ autosaveHandle: handle });
    } catch (err) {
      // Backend/DB failure -> degrade gracefully with an in-memory
      // fallback string instead of leaving the user stuck with no text.
      set({
        sessionId: newSessionId(),
        phase: "running",
        currentText:
          "practice text unavailable right now, offline fallback engaged for this session",
        typedChars: [],
        correctCount: 0,
        incorrectCount: 0,
        totalErrors: 0,
        elapsedMs: 0,
        errorMessage: `content load failed, using fallback text: ${String(err)}`,
      });
    }
  },

  resumeIfAvailable: async () => {
    const { sessionId } = get();
    try {
      const progress = await invoke<Progress | null>("load_progress", { sessionId });
      if (!progress) return false;
      set({
        currentText: progress.remaining_text,
        elapsedMs: progress.elapsed_ms,
        phase: "running",
      });
      return true;
    } catch {
      return false;
    }
  },

  typeChar: (ch: string) => {
    const { currentText, typedChars, correctCount, incorrectCount, totalErrors, mode, seenTextIds, category, language, difficulty } = get();
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
    // Cumulative, never reduced by a later backspace -- this is the
    // "how many mistakes did the user make" counter shown in the UI.
    const nextTotalErrors = totalErrors + (isCorrect ? 0 : 1);

    set({
      typedChars: nextTyped,
      correctCount: nextCorrect,
      incorrectCount: nextIncorrect,
      totalErrors: nextTotalErrors,
      wpm: calculateWpm(nextCorrect, get().elapsedMs),
      // Accuracy counts every mistake ever made against the user, even
      // ones they went back and fixed -- matches how typing.com /
      // 10fastfingers report accuracy, and is more honest than only
      // counting mistakes still visible on screen at the end.
      accuracy: calculateAccuracy(nextCorrect, nextCorrect + nextTotalErrors),
    });

    // Reached end of the current chunk.
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
            // Even if the fetch fails, don't dead-end the session: keep
            // the current (now-complete) text so the user can finish.
          });
      } else {
        get().finish();
      }
    }
  },

  removeLastChar: () => {
    // Lets the user go back and fix a mistake -- backspace removes the
    // last typed character and re-opens that position for retyping. If
    // they'd rather not fix it and just keep going, they simply don't
    // press backspace; typeChar() already lets typing continue past a
    // wrong character (it stays visibly red) instead of blocking input.
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
      // totalErrors is intentionally NOT reduced here -- a mistake that
      // gets fixed still happened, and still counts toward the error
      // total and the accuracy score. Only the live red/green display
      // (correctCount/incorrectCount) rolls back.
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
      set({ errorMessage: `could not save session history: ${String(err)}` });
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
