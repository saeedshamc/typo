import { useEffect, useMemo, useRef } from "react";
import { useTypingStore } from "../store/useTypingStore";
import { charsMatch, isRtlText } from "../utils/rtlCompare";
import {
  caretLineCol,
  splitEditorLines,
  tabInsertion,
  tokenizeLine,
  tokenKindAt,
} from "../utils/codeEditor";
import { CODE_LANGUAGE_LABELS } from "../types";

const LINE_WINDOW = 18;

function displayChar(ch: string): string {
  if (ch === " ") return "·";
  if (ch === "\t") return "→";
  return ch;
}

/**
 * Code mode renders like a desktop editor: gutter, current line, monospace,
 * soft syntax colors on pending text, Tab/Enter matching the source file.
 */
export function TypingArea() {
  const category = useTypingStore((s) => s.category);
  const language = useTypingStore((s) => s.language);
  const currentText = useTypingStore((s) => s.currentText);
  const typedChars = useTypingStore((s) => s.typedChars);
  const phase = useTypingStore((s) => s.phase);
  const typeChar = useTypingStore((s) => s.typeChar);
  const removeLastChar = useTypingStore((s) => s.removeLastChar);
  const fontSizePx = useTypingStore((s) => s.settings.fontSizePx);
  const caretStyle = useTypingStore((s) => s.settings.caretStyle);
  const caseSensitive = useTypingStore((s) => s.settings.caseSensitive);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const shadowValueRef = useRef("");
  const currentLineRef = useRef<HTMLDivElement>(null);

  const isCode = category === "code";
  const caret = typedChars.length;

  useEffect(() => {
    shadowValueRef.current = "";
    if (inputRef.current) inputRef.current.value = "";
  }, [currentText]);

  useEffect(() => {
    if (phase === "running") inputRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    currentLineRef.current?.scrollIntoView({ block: "nearest" });
  }, [caret, currentText]);

  const focusInput = () => {
    if (phase === "running") inputRef.current?.focus();
  };

  const feedChars = (chars: string) => {
    for (const ch of chars) typeChar(ch);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const prevValue = shadowValueRef.current;

    if (newValue.length > prevValue.length) {
      feedChars(newValue.slice(prevValue.length));
    } else if (newValue.length < prevValue.length) {
      const removedCount = prevValue.length - newValue.length;
      for (let i = 0; i < removedCount; i++) removeLastChar();
    }

    shadowValueRef.current = newValue;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (phase !== "running") return;

    if (e.key === "Tab") {
      e.preventDefault();
      const insertion = tabInsertion(currentText.slice(typedChars.length));
      feedChars(insertion);
      shadowValueRef.current += insertion;
      if (inputRef.current) inputRef.current.value = shadowValueRef.current;
      return;
    }

    // Keep Enter inside the editor; textarea already inserts \n via onChange.
    if (e.key === "Enter") {
      // no-op beyond default textarea behavior
    }
  };

  const lines = useMemo(() => splitEditorLines(currentText), [currentText]);
  const { line: caretLine, col: caretCol } = caretLineCol(currentText, caret);
  const lineStart = Math.max(0, caretLine - 1 - LINE_WINDOW);
  const lineEnd = Math.min(lines.length, caretLine + LINE_WINDOW);
  const visibleLines = lines.slice(lineStart, lineEnd);

  const rtl = !isCode && isRtlText(currentText);
  const langLabel = language ? CODE_LANGUAGE_LABELS[language] : "Code";
  const fileName =
    language === "python"
      ? "main.py"
      : language === "typescript"
        ? "main.ts"
        : language === "javascript"
          ? "main.js"
          : language === "rust"
            ? "main.rs"
            : language === "go"
              ? "main.go"
              : language === "java"
                ? "Main.java"
                : language === "csharp"
                  ? "Program.cs"
                  : language === "php"
                    ? "main.php"
                    : language === "kotlin"
                      ? "Main.kt"
                      : language === "ruby"
                        ? "main.rb"
                        : language === "swift"
                          ? "main.swift"
                          : language === "sql"
                            ? "query.sql"
                            : language === "cpp"
                              ? "main.cpp"
                              : "main.txt";

  if (!isCode) {
    return (
      <div
        className={`typing-area caret-${caretStyle}`}
        dir={rtl ? "rtl" : "ltr"}
        style={{ fontSize: `${fontSizePx}px` }}
        onClick={focusInput}
        role="presentation"
      >
        <div className="typing-text" aria-hidden="true">
          {currentText.split("").map((ch, i) => {
            let className = "char-pending";
            if (i < typedChars.length) {
              className = charsMatch(ch, typedChars[i], caseSensitive)
                ? "char-correct"
                : "char-incorrect";
            }
            if (i === typedChars.length) className += " char-cursor";
            return (
              <span key={i} className={className}>
                {ch === " " ? "\u00A0" : ch}
              </span>
            );
          })}
        </div>
        <textarea
          ref={inputRef}
          className="typing-input-sink"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          disabled={phase !== "running"}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="typing input"
          rows={1}
        />
      </div>
    );
  }

  return (
    <div
      className={`code-editor caret-${caretStyle === "underline" ? "block" : caretStyle}`}
      style={{ fontSize: `${Math.max(14, fontSizePx - 2)}px` }}
      onClick={focusInput}
      role="presentation"
      dir="ltr"
    >
      <div className="code-editor-tabbar">
        <span className="code-editor-tab active">{fileName}</span>
        <span className="code-editor-lang">{langLabel}</span>
      </div>

      <div className="code-editor-body">
        <div className="code-gutter" aria-hidden="true">
          {visibleLines.map((line) => (
            <div
              key={line.number}
              className={`code-gutter-line${line.number === caretLine ? " current" : ""}`}
            >
              {line.number}
            </div>
          ))}
        </div>

        <div className="code-lines" aria-hidden="true">
          {lineStart > 0 && <div className="code-line muted">…</div>}
          {visibleLines.map((line) => {
            const tokens = tokenizeLine(line.text);
            const isCurrent = line.number === caretLine;
            return (
              <div
                key={line.number}
                ref={isCurrent ? currentLineRef : undefined}
                className={`code-line${isCurrent ? " current" : ""}`}
              >
                {line.text.length === 0 ? (
                  <span
                    className={
                      caret === line.start ? "char-pending char-cursor" : "char-pending"
                    }
                  >
                    {" "}
                  </span>
                ) : (
                  line.text.split("").map((ch, offset) => {
                    const i = line.start + offset;
                    const token = tokenKindAt(tokens, offset);
                    let className = `char-pending tok-${token}`;
                    if (i < typedChars.length) {
                      className = charsMatch(ch, typedChars[i], caseSensitive)
                        ? "char-correct"
                        : "char-incorrect";
                    }
                    if (i === typedChars.length) className += " char-cursor";
                    const shown = displayChar(ch);
                    return (
                      <span
                        key={i}
                        className={`${className}${ch === " " || ch === "\t" ? " ws" : ""}`}
                      >
                        {shown}
                      </span>
                    );
                  })
                )}
                {caret === line.start + line.text.length &&
                  currentText[caret] === "\n" && (
                    <span className="char-pending char-cursor code-newline-mark">⏎</span>
                  )}
              </div>
            );
          })}
          {lineEnd < lines.length && <div className="code-line muted">…</div>}
        </div>
      </div>

      <div className="code-statusbar">
        <span>
          Ln {caretLine}, Col {caretCol}
        </span>
        <span>Spaces: 2</span>
        <span>UTF-8</span>
        <span>{langLabel}</span>
      </div>

      <textarea
        ref={inputRef}
        className="typing-input-sink"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        disabled={phase !== "running"}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-label="code editor typing input"
        rows={1}
      />
    </div>
  );
}
