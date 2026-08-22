/**
 * Standard typing-test convention: one "word" = 5 characters (including
 * spaces), regardless of the language's actual word boundaries. This
 * keeps WPM comparable across Persian/English/code content.
 */
export function calculateWpm(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  const minutes = elapsedMs / 60000;
  const words = correctChars / 5;
  return Math.round((words / minutes) * 10) / 10;
}

export function calculateAccuracy(correctChars: number, totalTypedChars: number): number {
  if (totalTypedChars <= 0) return 100;
  return Math.round((correctChars / totalTypedChars) * 1000) / 10;
}
