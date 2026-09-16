import { useTypingStore } from "../store/useTypingStore";
import type { Category, CodeLanguage, Difficulty, SessionMode } from "../types";
import { CODE_LANGUAGE_LABELS } from "../types";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "persian", label: "متن فارسی" },
  { value: "english", label: "English text" },
  { value: "code", label: "کد برنامه‌نویسی" },
  { value: "custom", label: "متن من" },
];

const CODE_LANGUAGES = (Object.keys(CODE_LANGUAGE_LABELS) as CodeLanguage[]).map((value) => ({
  value,
  label: CODE_LANGUAGE_LABELS[value],
}));

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
  const {
    category,
    language,
    difficulty,
    mode,
    durationSecs,
    phase,
    customText,
    setSelection,
    setCustomText,
    startSession,
  } = useTypingStore((s) => ({
    category: s.category,
    language: s.language,
    difficulty: s.difficulty,
    mode: s.mode,
    durationSecs: s.durationSecs,
    phase: s.phase,
    customText: s.customText,
    setSelection: s.setSelection,
    setCustomText: s.setCustomText,
    startSession: s.startSession,
  }));

  const locked = phase === "running" || phase === "paused";
  const canStart = phase === "idle" || phase === "finished";

  return (
    <div className="category-selector">
      <fieldset disabled={locked}>
        <legend>نوع متن</legend>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            className={category === c.value ? "active" : ""}
            onClick={() =>
              setSelection({
                category: c.value,
                language: c.value === "code" ? "javascript" : null,
              })
            }
          >
            {c.label}
          </button>
        ))}
      </fieldset>

      {category === "code" && (
        <fieldset disabled={locked}>
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

      {category === "custom" && (
        <div className="custom-text-box">
          <label htmlFor="custom-text">متن دلخواه را بچسبانید</label>
          <textarea
            id="custom-text"
            disabled={locked}
            rows={5}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="متن تمرین خود را اینجا وارد کنید..."
          />
        </div>
      )}

      {category !== "custom" && (
        <fieldset disabled={locked}>
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
      )}

      <fieldset disabled={locked}>
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
        <fieldset disabled={locked}>
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

      {canStart && (
        <button className="start-button" onClick={() => startSession()}>
          {phase === "finished" ? "شروع دوباره" : "شروع تست"}
        </button>
      )}
    </div>
  );
}
