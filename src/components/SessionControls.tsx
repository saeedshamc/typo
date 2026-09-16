import { useTypingStore } from "../store/useTypingStore";

export function SessionControls() {
  const phase = useTypingStore((s) => s.phase);
  const wpm = useTypingStore((s) => s.wpm);
  const accuracy = useTypingStore((s) => s.accuracy);
  const totalErrors = useTypingStore((s) => s.totalErrors);
  const pause = useTypingStore((s) => s.pause);
  const resume = useTypingStore((s) => s.resume);
  const reset = useTypingStore((s) => s.reset);
  const finish = useTypingStore((s) => s.finish);
  const startSession = useTypingStore((s) => s.startSession);
  const mode = useTypingStore((s) => s.mode);

  if (phase === "idle") return null;

  return (
    <div className="session-controls">
      {(phase === "running" || phase === "paused") && (
        <div className="session-controls-actions">
          {phase === "running" ? (
            <button type="button" onClick={() => pause()}>
              توقف
            </button>
          ) : (
            <button type="button" onClick={() => resume()}>
              ادامه
            </button>
          )}
          {(mode === "endless" || mode === "practice") && (
            <button type="button" onClick={() => finish()}>
              پایان سشن
            </button>
          )}
          <button type="button" className="danger" onClick={() => reset()}>
            بازنشانی
          </button>
        </div>
      )}

      {phase === "finished" && (
        <div className="session-finished">
          <p className="session-finished-summary">
            نتیجه: {wpm} WPM — دقت {accuracy}% — {totalErrors} خطا
          </p>
          <div className="session-controls-actions">
            <button
              type="button"
              className="start-button inline"
              onClick={() => {
                reset();
                void startSession();
              }}
            >
              تست جدید با همین تنظیمات
            </button>
            <button type="button" onClick={() => reset()}>
              بازگشت به انتخاب
            </button>
          </div>
        </div>
      )}

      {phase === "paused" && <p className="session-paused-hint">سشن متوقف است</p>}
    </div>
  );
}
