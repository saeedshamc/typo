import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTypingStore } from "../store/useTypingStore";
import type { Category, SessionRecord } from "../types";

interface PersonalBest {
  category: string;
  bestWpm: number;
  bestAccuracy: number;
}

function computeBests(history: SessionRecord[]): PersonalBest[] {
  const map = new Map<string, PersonalBest>();
  for (const row of history) {
    const wpm = row.wpm ?? 0;
    const accuracy = row.accuracy ?? 0;
    const current = map.get(row.category);
    if (!current) {
      map.set(row.category, {
        category: row.category,
        bestWpm: wpm,
        bestAccuracy: accuracy,
      });
      continue;
    }
    map.set(row.category, {
      category: row.category,
      bestWpm: Math.max(current.bestWpm, wpm),
      bestAccuracy: Math.max(current.bestAccuracy, accuracy),
    });
  }
  return Array.from(map.values());
}

const CATEGORY_LABEL: Record<string, string> = {
  persian: "فارسی",
  english: "English",
  code: "کد",
  custom: "متن من",
};

export function StatsPanel() {
  const wpm = useTypingStore((s) => s.wpm);
  const accuracy = useTypingStore((s) => s.accuracy);
  const totalErrors = useTypingStore((s) => s.totalErrors);
  const phase = useTypingStore((s) => s.phase);
  const errorMessage = useTypingStore((s) => s.errorMessage);
  const suggestedDifficulty = useTypingStore((s) => s.suggestedDifficulty);
  const setSelection = useTypingStore((s) => s.setSelection);
  const clearDifficultySuggestion = useTypingStore((s) => s.clearDifficultySuggestion);

  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = () => {
    invoke<SessionRecord[]>("get_history", { limit: 50 })
      .then(setHistory)
      .catch((err) => setHistoryError(String(err)));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (phase === "finished" || phase === "idle") loadHistory();
  }, [phase]);

  const bests = useMemo(() => computeBests(history), [history]);

  return (
    <div className="stats-panel">
      <div className="live-stats">
        <div>
          <span className="stat-value">{wpm}</span>
          <span className="stat-label">WPM</span>
        </div>
        <div>
          <span className="stat-value">{accuracy}%</span>
          <span className="stat-label">دقت</span>
        </div>
        <div>
          <span className="stat-value stat-value-error">{totalErrors}</span>
          <span className="stat-label">تعداد خطا</span>
        </div>
      </div>

      {errorMessage && <p className="warning">{errorMessage}</p>}

      {phase === "finished" && suggestedDifficulty && (
        <div className="difficulty-suggestion">
          <p>
            پیشنهاد سطح بعدی:{" "}
            <strong>
              {suggestedDifficulty === "beginner"
                ? "مبتدی"
                : suggestedDifficulty === "intermediate"
                  ? "متوسط"
                  : "پیشرفته"}
            </strong>
          </p>
          <div className="session-controls-actions">
            <button
              type="button"
              className="start-button inline"
              onClick={() => {
                setSelection({ difficulty: suggestedDifficulty });
                clearDifficultySuggestion();
              }}
            >
              اعمال پیشنهاد
            </button>
            <button type="button" onClick={() => clearDifficultySuggestion()}>
              رد کردن
            </button>
          </div>
        </div>
      )}

      {bests.length > 0 && (
        <div className="personal-bests">
          <h3>بهترین‌های شخصی</h3>
          <ul>
            {bests.map((b) => (
              <li key={b.category}>
                {CATEGORY_LABEL[b.category] ?? b.category}: {b.bestWpm} WPM — دقت {b.bestAccuracy}%
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="history">
        <h3>تاریخچه‌ی اخیر</h3>
        {historyError && <p className="warning">{historyError}</p>}
        {history.length === 0 ? (
          <p className="muted">هنوز سشنی ثبت نشده است.</p>
        ) : (
          <ul>
            {history.slice(0, 10).map((h) => (
              <li key={h.id}>
                {CATEGORY_LABEL[h.category as Category] ?? h.category} / {h.difficulty} —{" "}
                {h.wpm ?? "-"} WPM, {h.accuracy ?? "-"}%، {h.errors ?? "-"} خطا
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
