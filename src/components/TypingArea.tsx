import { useEffect, useRef } from "react";
import { useTypingStore } from "../store/useTypingStore";
import { charsMatch, isRtlText } from "../utils/rtlCompare";

/**
 * Why a hidden <input> instead of raw keydown listeners on a div:
 * Persian input often goes through OS-level composition (especially with
 * certain keyboard layouts / IME setups). Listening to keydown/keyCode
 * directly is unreliable for composed input and for correctly handling
 * backspace across multi-byte sequences. Using a real input's `value` and
 * diffing against what we've already consumed is the robust approach, and
 * it's what typingtest-style sites do under the hood as well.
 */
export function TypingArea() {
  const currentText = useTypingStore((s) => s.currentText);
  const typedChars = useTypingStore((s) => s.typedChars);
  const phase = useTypingStore((s) => s.phase);
  const typeChar = useTypingStore((s) => s.typeChar);
  const removeLastChar = useTypingStore((s) => s.removeLastChar);

  const inputRef = useRef<HTMLInputElement>(null);
  const shadowValueRef = useRef(""); // mirrors what the store has consumed

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

  return (
    <div
      className="typing-area"
      dir={rtl ? "rtl" : "ltr"}
      onClick={focusInput}
      role="presentation"
    >
      <div className="typing-text" aria-hidden="true">
        {currentText.split("").map((ch, i) => {
          let className = "char-pending";
          if (i < typedChars.length) {
            className = charsMatch(ch, typedChars[i]) ? "char-correct" : "char-incorrect";
          }
          if (i === typedChars.length) className += " char-cursor";
          return (
            <span key={i} className={className}>
              {ch}
            </span>
          );
        })}
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
