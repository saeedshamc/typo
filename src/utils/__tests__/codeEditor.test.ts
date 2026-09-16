import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  caretLineCol,
  splitEditorLines,
  tabInsertion,
  tokenizeLine,
  tokenKindAt,
} from "../codeEditor.ts";

describe("codeEditor helpers", () => {
  it("splits lines with correct offsets", () => {
    const lines = splitEditorLines("ab\ncd\n");
    assert.equal(lines.length, 3);
    assert.equal(lines[0].start, 0);
    assert.equal(lines[1].start, 3);
    assert.equal(lines[2].text, "");
  });

  it("computes line and column", () => {
    assert.deepEqual(caretLineCol("ab\ncd", 0), { line: 1, col: 1 });
    assert.deepEqual(caretLineCol("ab\ncd", 3), { line: 2, col: 1 });
    assert.deepEqual(caretLineCol("ab\ncd", 5), { line: 2, col: 3 });
  });

  it("chooses tab insertion from expected text", () => {
    assert.equal(tabInsertion("\tfoo"), "\t");
    assert.equal(tabInsertion("    bar"), "    ");
    assert.equal(tabInsertion("baz"), "  ");
  });

  it("tokenizes keywords and strings", () => {
    const spans = tokenizeLine('const name = "Ada";');
    assert.equal(tokenKindAt(spans, 0), "keyword");
    assert.equal(tokenKindAt(spans, 13), "string");
  });
});
