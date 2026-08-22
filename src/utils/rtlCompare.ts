/**
 * Persian/Arabic letters render in different presentation forms depending
 * on position in the word (isolated / initial / medial / final), and the
 * OS input layer can sometimes deliver either the base character or a
 * presentation-form codepoint depending on the keyboard driver.
 *
 * Comparing raw keypress codepoints against the target text directly is
 * fragile for RTL scripts. Instead we normalize both the target character
 * and the typed character down to their base Unicode form before
 * comparing, so "the same letter, different visual shape" never registers
 * as a typo.
 */

// Presentation-form ranges (Arabic Presentation Forms-A/B) mapped back to
// their base Arabic/Persian letter. This covers the common Persian set;
// extend as needed for full Arabic coverage.
const PRESENTATION_TO_BASE: Record<string, string> = {
  // Alef
  "\uFE8D": "\u0627", "\uFE8E": "\u0627",
  // Beh
  "\uFE8F": "\u0628", "\uFE90": "\u0628", "\uFE91": "\u0628", "\uFE92": "\u0628",
  // Peh (Persian)
  "\uFB56": "\u067E", "\uFB57": "\u067E", "\uFB58": "\u067E", "\uFB59": "\u067E",
  // Teh
  "\uFE95": "\u062A", "\uFE96": "\u062A", "\uFE97": "\u062A", "\uFE98": "\u062A",
  // Jeem
  "\uFE9D": "\u062C", "\uFE9E": "\u062C", "\uFE9F": "\u062C", "\uFEA0": "\u062C",
  // Cheh (Persian)
  "\uFB7A": "\u0686", "\uFB7B": "\u0686", "\uFB7C": "\u0686", "\uFB7D": "\u0686",
  // Hah
  "\uFEA1": "\u062D", "\uFEA2": "\u062D", "\uFEA3": "\u062D", "\uFEA4": "\u062D",
  // Dal
  "\uFEA9": "\u062F", "\uFEAA": "\u062F",
  // Reh
  "\uFEAD": "\u0631", "\uFEAE": "\u0631",
  // Zeh
  "\uFEAF": "\u0632", "\uFEB0": "\u0632",
  // Zheh (Persian)
  "\uFB8A": "\u0698", "\uFB8B": "\u0698",
  // Seen
  "\uFEB1": "\u0633", "\uFEB2": "\u0633", "\uFEB3": "\u0633", "\uFEB4": "\u0633",
  // Sheen
  "\uFEB5": "\u0634", "\uFEB6": "\u0634", "\uFEB7": "\u0634", "\uFEB8": "\u0634",
  // Sad
  "\uFEB9": "\u0635", "\uFEBA": "\u0635", "\uFEBB": "\u0635", "\uFEBC": "\u0635",
  // Zad
  "\uFEBD": "\u0636", "\uFEBE": "\u0636", "\uFEBF": "\u0636", "\uFEC0": "\u0636",
  // Tah
  "\uFEC1": "\u0637", "\uFEC2": "\u0637", "\uFEC3": "\u0637", "\uFEC4": "\u0637",
  // Zah
  "\uFEC5": "\u0638", "\uFEC6": "\u0638", "\uFEC7": "\u0638", "\uFEC8": "\u0638",
  // Ain
  "\uFEC9": "\u0639", "\uFECA": "\u0639", "\uFECB": "\u0639", "\uFECC": "\u0639",
  // Ghain
  "\uFECD": "\u063A", "\uFECE": "\u063A", "\uFECF": "\u063A", "\uFED0": "\u063A",
  // Feh
  "\uFED1": "\u0641", "\uFED2": "\u0641", "\uFED3": "\u0641", "\uFED4": "\u0641",
  // Qaf
  "\uFED5": "\u0642", "\uFED6": "\u0642", "\uFED7": "\u0642", "\uFED8": "\u0642",
  // Kaf
  "\uFED9": "\u0643", "\uFEDA": "\u0643", "\uFEDB": "\u0643", "\uFEDC": "\u0643",
  // Gaf (Persian)
  "\uFB92": "\u06AF", "\uFB93": "\u06AF", "\uFB94": "\u06AF", "\uFB95": "\u06AF",
  // Lam
  "\uFEDD": "\u0644", "\uFEDE": "\u0644", "\uFEDF": "\u0644", "\uFEE0": "\u0644",
  // Meem
  "\uFEE1": "\u0645", "\uFEE2": "\u0645", "\uFEE3": "\u0645", "\uFEE4": "\u0645",
  // Noon
  "\uFEE5": "\u0646", "\uFEE6": "\u0646", "\uFEE7": "\u0646", "\uFEE8": "\u0646",
  // Vav
  "\uFEED": "\u0648", "\uFEEE": "\u0648",
  // Heh
  "\uFEE9": "\u0647", "\uFEEA": "\u0647", "\uFEEB": "\u0647", "\uFEEC": "\u0647",
  // Yeh (Persian/Farsi Yeh)
  "\uFEEF": "\u06CC", "\uFEF0": "\u06CC", "\uFEF1": "\u06CC", "\uFEF2": "\u06CC",
};

// Arabic Yeh (٠٦cc used above already); also normalize Arabic Kaf (0643)
// vs Persian Keheh (06A9), and Arabic Yeh (064A) vs Persian Yeh (06CC) --
// both pairs are visually near-identical and commonly confused across
// keyboard layouts / fonts, so we treat them as equivalent for grading.
const LOOKALIKE_EQUIVALENTS: Record<string, string> = {
  "\u0643": "\u06A9", // Arabic Kaf -> Persian Keheh
  "\u064A": "\u06CC", // Arabic Yeh -> Persian Yeh
  "\u0649": "\u06CC", // Alef Maksura -> Persian Yeh
};

export function toBaseChar(ch: string): string {
  const presentationNormalized = PRESENTATION_TO_BASE[ch] ?? ch;
  return LOOKALIKE_EQUIVALENTS[presentationNormalized] ?? presentationNormalized;
}

/** True if `typed` should count as a correct match for `expected`. */
export function charsMatch(expected: string, typed: string): boolean {
  return toBaseChar(expected) === toBaseChar(typed);
}

export function isRtlText(text: string): boolean {
  // Arabic/Persian Unicode block ranges.
  return /[\u0600-\u06FF\u0750-\u077F]/.test(text);
}
