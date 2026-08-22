import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useTypingStore } from "../store/useTypingStore";
import type { SessionRecord } from "../types";

export function StatsPanel() {
  const wpm = useTypingStore((s) => s.wpm);
  const accuracy = useTypingStore((s) => s.accuracy);
  const totalErrors = useTypingStore((s) => s.totalErrors);
  const phase = useTypingStore((s) => s.phase);
  const errorMessage = useTypingStore((s) => s.errorMessage);

  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (phase !== "finished") return;
    invoke<SessionRecord[]>("get_history", { limit: 10 })
      .then(setHistory)
      .catch((err) => setHistoryError(String(err)));
  }, [phase]);

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

      {phase === "finished" && (
        <div className="history">
          <h3>تاریخچه‌ی اخیر</h3>
          {historyError && <p className="warning">{historyError}</p>}
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                {h.category} / {h.difficulty} — {h.wpm ?? "-"} WPM, {h.accuracy ?? "-"}%، {h.errors ?? "-"} خطا
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
