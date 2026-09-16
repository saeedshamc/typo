export type TokenKind =
  | "plain"
  | "keyword"
  | "string"
  | "comment"
  | "number"
  | "type"
  | "punctuation";

export interface TokenSpan {
  start: number;
  end: number;
  kind: TokenKind;
}

const KEYWORDS = new Set([
  "break", "case", "catch", "class", "const", "continue", "debugger", "default",
  "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for",
  "function", "if", "import", "in", "instanceof", "let", "new", "null", "return",
  "super", "switch", "this", "throw", "true", "try", "typeof", "var", "void",
  "while", "with", "yield", "async", "await", "of", "from", "as", "type",
  "interface", "implements", "private", "public", "protected", "static",
  "readonly", "namespace", "module", "declare", "abstract", "override",
  "def", "elif", "except", "lambda", "pass", "raise", "with", "nonlocal",
  "None", "True", "False", "and", "or", "not", "is",
  "fn", "mut", "pub", "impl", "trait", "where", "match", "loop", "use", "mod",
  "crate", "self", "Self", "ref", "move", "dyn", "async", "await",
  "package", "func", "go", "defer", "chan", "select", "map", "range",
  "fun", "val", "var", "when", "object", "companion", "data", "sealed",
  "SELECT", "FROM", "WHERE", "INSERT", "UPDATE", "DELETE", "JOIN", "LEFT",
  "RIGHT", "INNER", "OUTER", "GROUP", "BY", "ORDER", "HAVING", "CREATE",
  "INDEX", "TABLE", "INTO", "VALUES", "SET", "AND", "OR", "NOT", "AS", "ON",
  "WITH", "LIMIT", "OFFSET", "DISTINCT",
]);

/** Lightweight per-line tokenizer for soft pending syntax colors. */
export function tokenizeLine(line: string): TokenSpan[] {
  const spans: TokenSpan[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];

    if (ch === " " || ch === "\t") {
      i += 1;
      continue;
    }

    if (ch === "/" && line[i + 1] === "/") {
      spans.push({ start: i, end: line.length, kind: "comment" });
      break;
    }
    if (ch === "-" && line[i + 1] === "-") {
      spans.push({ start: i, end: line.length, kind: "comment" });
      break;
    }
    if (ch === "#") {
      spans.push({ start: i, end: line.length, kind: "comment" });
      break;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < line.length) {
        if (line[j] === "\\") {
          j += 2;
          continue;
        }
        if (line[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      spans.push({ start: i, end: j, kind: "string" });
      i = j;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[0-9_.]/.test(line[j])) j += 1;
      spans.push({ start: i, end: j, kind: "number" });
      i = j;
      continue;
    }

    if (/[A-Za-z_$@]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[A-Za-z0-9_$@]/.test(line[j])) j += 1;
      const word = line.slice(i, j);
      const kind: TokenKind =
        KEYWORDS.has(word) || KEYWORDS.has(word.toUpperCase())
          ? "keyword"
          : /^[A-Z]/.test(word)
            ? "type"
            : "plain";
      spans.push({ start: i, end: j, kind });
      i = j;
      continue;
    }

    spans.push({ start: i, end: i + 1, kind: "punctuation" });
    i += 1;
  }
  return spans;
}

export function tokenKindAt(spans: TokenSpan[], index: number): TokenKind {
  for (const span of spans) {
    if (index >= span.start && index < span.end) return span.kind;
  }
  return "plain";
}

export interface EditorLine {
  start: number;
  text: string;
  number: number;
}

export function splitEditorLines(text: string): EditorLine[] {
  const parts = text.split("\n");
  const lines: EditorLine[] = [];
  let start = 0;
  for (let i = 0; i < parts.length; i++) {
    lines.push({ start, text: parts[i], number: i + 1 });
    start += parts[i].length + (i < parts.length - 1 ? 1 : 0);
  }
  return lines;
}

export function caretLineCol(text: string, caret: number): { line: number; col: number } {
  const before = text.slice(0, caret);
  const lines = before.split("\n");
  return { line: lines.length, col: (lines[lines.length - 1]?.length ?? 0) + 1 };
}

/** Decide what Tab should insert based on the remaining expected text. */
export function tabInsertion(expectedRemaining: string): string {
  if (expectedRemaining.startsWith("\t")) return "\t";
  const spaces = expectedRemaining.match(/^ +/);
  if (spaces) return spaces[0];
  return "  ";
}
