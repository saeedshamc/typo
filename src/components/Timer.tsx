import { useEffect, useRef } from "react";
import { useTypingStore } from "../store/useTypingStore";

/**
 * setInterval drifts over long sessions (each callback can fire slightly
 * late, and the error accumulates). This timer instead measures real
 * elapsed wall-clock time on every animation frame and feeds the *delta*
 * into the store, so accumulated drift stays near zero regardless of
 * session length.
 */
export function Timer() {
  const phase = useTypingStore((s) => s.phase);
  const durationSecs = useTypingStore((s) => s.durationSecs);
  const mode = useTypingStore((s) => s.mode);
  const elapsedMs = useTypingStore((s) => s.elapsedMs);
  const tick = useTypingStore((s) => s.tick);

  const lastFrameRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "running") {
      lastFrameRef.current = null;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      return;
    }

    const step = (now: number) => {
      if (lastFrameRef.current !== null) {
        const delta = now - lastFrameRef.current;
        tick(delta);
      }
      lastFrameRef.current = now;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      lastFrameRef.current = null;
    };
  }, [phase, tick]);

  const remainingSecs =
    mode === "timed" ? Math.max(0, durationSecs - Math.floor(elapsedMs / 1000)) : null;

  return (
    <div className="timer" aria-live="polite">
      {mode === "timed" ? (
        <span>{remainingSecs}s</span>
      ) : (
        <span>{(elapsedMs / 1000).toFixed(1)}s</span>
      )}
    </div>
  );
}
