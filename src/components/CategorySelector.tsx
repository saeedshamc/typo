import { useTypingStore } from "../store/useTypingStore";
import type { Category, CodeLanguage, Difficulty, SessionMode } from "../types";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "persian", label: "متن فارسی" },
  { value: "english", label: "English text" },
  { value: "code", label: "کد برنامه‌نویسی" },
];

const CODE_LANGUAGES: { value: CodeLanguage; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "rust", label: "Rust" },
  { value: "php", label: "PHP" },
  { value: "kotlin", label: "Kotlin" },
];

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "مبتدی" },
  { value: "intermediate", label: "متوسط" },
  { value: "advanced", label: "پیشرفته" },
];

const MODES: { value: SessionMode; label: string }[] = [
  { value: "timed", label: "زمان‌دار" },
  { value: "endless", label: "نامحدود" },
  { value: "practice", label: "تمرین آزاد" },
];

const DURATIONS = [15, 30, 60, 120];

export function CategorySelector() {
  const { category, language, difficulty, mode, durationSecs, phase, setSelection, startSession } =
    useTypingStore((s) => ({
      category: s.category,
      language: s.language,
      difficulty: s.difficulty,
      mode: s.mode,
      durationSecs: s.durationSecs,
      phase: s.phase,
      setSelection: s.setSelection,
      startSession: s.startSession,
    }));

  const disabled = phase === "running";

  return (
    <div className="category-selector">
      <fieldset disabled={disabled}>
        <legend>نوع متن</legend>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            className={category === c.value ? "active" : ""}
            onClick={() => setSelection({ category: c.value, language: c.value === "code" ? "javascript" : null })}
          >
            {c.label}
          </button>
        ))}
      </fieldset>

      {category === "code" && (
        <fieldset disabled={disabled}>
          <legend>زبان برنامه‌نویسی</legend>
          {CODE_LANGUAGES.map((l) => (
            <button
              key={l.value}
              className={language === l.value ? "active" : ""}
              onClick={() => setSelection({ language: l.value })}
            >
              {l.label}
            </button>
          ))}
        </fieldset>
      )}

      <fieldset disabled={disabled}>
        <legend>سطح دشواری</legend>
        {DIFFICULTIES.map((d) => (
          <button
            key={d.value}
            className={difficulty === d.value ? "active" : ""}
            onClick={() => setSelection({ difficulty: d.value })}
          >
            {d.label}
          </button>
        ))}
      </fieldset>

      <fieldset disabled={disabled}>
        <legend>حالت</legend>
        {MODES.map((m) => (
          <button
            key={m.value}
            className={mode === m.value ? "active" : ""}
            onClick={() => setSelection({ mode: m.value })}
          >
            {m.label}
          </button>
        ))}
      </fieldset>

      {mode === "timed" && (
        <fieldset disabled={disabled}>
          <legend>مدت زمان</legend>
          {DURATIONS.map((d) => (
            <button
              key={d}
              className={durationSecs === d ? "active" : ""}
              onClick={() => setSelection({ durationSecs: d })}
            >
              {d}s
            </button>
          ))}
        </fieldset>
      )}

      <button className="start-button" disabled={disabled} onClick={() => startSession()}>
        شروع تست
      </button>
    </div>
  );
}
