import { useTypingStore } from "../store/useTypingStore";

export function ResumePrompt() {
  const pendingResume = useTypingStore((s) => s.pendingResume);
  const acceptResume = useTypingStore((s) => s.acceptResume);
  const dismissResume = useTypingStore((s) => s.dismissResume);

  if (!pendingResume) return null;

  const minutes = Math.floor(pendingResume.elapsed_ms / 60000);
  const seconds = Math.floor((pendingResume.elapsed_ms % 60000) / 1000);

  return (
    <div className="resume-prompt" role="dialog" aria-label="ادامه سشن قبلی">
      <p>
        یک سشن ناتمام پیدا شد ({pendingResume.category} / {pendingResume.difficulty}
        {" — "}
        {minutes}:{seconds.toString().padStart(2, "0")} گذشته). ادامه می‌دهی؟
      </p>
      <div className="session-controls-actions">
        <button type="button" className="start-button inline" onClick={() => acceptResume()}>
          ادامه سشن
        </button>
        <button type="button" onClick={() => void dismissResume()}>
          نادیده گرفتن
        </button>
      </div>
    </div>
  );
}
