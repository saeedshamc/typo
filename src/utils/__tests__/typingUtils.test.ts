import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAccuracy, calculateWpm } from "../wpmCalculator.ts";
import { charsMatch, isRtlText, toBaseChar } from "../rtlCompare.ts";

describe("calculateWpm", () => {
  it("returns 0 when elapsed is zero", () => {
    assert.equal(calculateWpm(100, 0), 0);
  });

  it("uses five characters per word", () => {
    assert.equal(calculateWpm(50, 60_000), 10);
  });
});

describe("calculateAccuracy", () => {
  it("returns 100 when nothing typed", () => {
    assert.equal(calculateAccuracy(0, 0), 100);
  });

  it("rounds to one decimal place", () => {
    assert.equal(calculateAccuracy(9, 10), 90);
    assert.equal(calculateAccuracy(1, 3), 33.3);
  });
});

describe("rtlCompare", () => {
  it("matches identical Latin characters", () => {
    assert.equal(charsMatch("a", "a"), true);
    assert.equal(charsMatch("A", "a"), false);
  });

  it("can ignore case when requested", () => {
    assert.equal(charsMatch("A", "a", false), true);
  });

  it("normalizes Persian lookalikes", () => {
    assert.equal(toBaseChar("\u064A"), "\u06CC");
    assert.equal(charsMatch("\u06CC", "\u064A"), true);
  });

  it("detects RTL text", () => {
    assert.equal(isRtlText("سلام"), true);
    assert.equal(isRtlText("hello"), false);
  });
});
