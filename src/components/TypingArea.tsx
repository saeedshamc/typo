import { useEffect, useRef } from "react";
import { useTypingStore } from "../store/useTypingStore";
import { charsMatch, isRtlText } from "../utils/rtlCompare";

const WINDOW_RADIUS = 120;

/**
 * Why a hidden <input> instead of raw keydown listeners on a div:
 * Persian input often goes through OS-level composition. Using a real
 * input's value and diffing is the robust approach for IME/backspace.
 *
 * For long endless sessions we only render a window of characters around
 * the caret so the DOM does not grow without bound.
 */
export function TypingArea() {
  const currentText = useTypingStore((s) => s.currentText);
  const typedChars = useTypingStore((s) => s.typedChars);
  const phase = useTypingStore((s) => s.phase);
  const typeChar = useTypingStore((s) => s.typeChar);
  const removeLastChar = useTypingStore((s) => s.removeLastChar);
  const fontSizePx = useTypingStore((s) => s.settings.fontSizePx);
  const caretStyle = useTypingStore((s) => s.settings.caretStyle);
  const caseSensitive = useTypingStore((s) => s.settings.caseSensitive);

  const inputRef = useRef<HTMLInputElement>(null);
  const shadowValueRef = useRef("");

  useEffect(() => {
    shadowValueRef.current = "";
    if (inputRef.current) inputRef.current.value = "";
  }, [currentText]);

  useEffect(() => {
    if (phase === "running") inputRef.current?.focus();
  }, [phase]);

  const focusInput = () => {
    if (phase === "running") inputRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const prevValue = shadowValueRef.current;

    if (newValue.length > prevValue.length) {
      const added = newValue.slice(prevValue.length);
      for (const ch of added) typeChar(ch);
    } else if (newValue.length < prevValue.length) {
      const removedCount = prevValue.length - newValue.length;
      for (let i = 0; i < removedCount; i++) removeLastChar();
    }

    shadowValueRef.current = newValue;
  };

  const rtl = isRtlText(currentText);
  const caret = typedChars.length;
  const start = Math.max(0, caret - WINDOW_RADIUS);
  const end = Math.min(currentText.length, caret + WINDOW_RADIUS);
  const chars = currentText.slice(start, end).split("");

  return (
    <div
      className={`typing-area caret-${caretStyle}`}
      dir={rtl ? "rtl" : "ltr"}
      style={{ fontSize: `${fontSizePx}px` }}
      onClick={focusInput}
      role="presentation"
    >
      <div className="typing-text" aria-hidden="true">
        {start > 0 && <span className="char-pending">…</span>}
        {chars.map((ch, offset) => {
          const i = start + offset;
          let className = "char-pending";
          if (i < typedChars.length) {
            className = charsMatch(ch, typedChars[i], caseSensitive)
              ? "char-correct"
              : "char-incorrect";
          }
          if (i === typedChars.length) className += " char-cursor";
          return (
            <span key={i} className={className}>
              {ch}
            </span>
          );
        })}
        {end < currentText.length && <span className="char-pending">…</span>}
      </div>
      <input
        ref={inputRef}
        className="typing-input-sink"
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={phase !== "running"}
        onChange={handleChange}
        aria-label="typing input"
      />
    </div>
  );
}
