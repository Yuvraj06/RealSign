import type { MockPhrase } from "../types";

/**
 * Scripted output for Phase 1, before a real model exists.
 *
 * Mixes word signs and fingerspelling in one stream, because that is what the
 * finished pipeline produces and the UI has to read as a single line rather
 * than two systems bolted together.
 *
 * Confidences are deliberately uneven. Letters M, N, S and T sit low because
 * a landmark classifier genuinely confuses them, and THANK-YOU sits low
 * because it starts almost identically to GOOD. The UI needs designing around
 * that doubt rather than around a perfect run.
 */
export const MOCK_SCRIPT: MockPhrase[] = [
  {
    smoothed: "Hello.",
    tokens: [{ kind: "sign", value: "HELLO", confidence: 0.93 }],
  },
  {
    // ASL word order, no articles and no tense. The smoothing step is what
    // turns MY NAME S-A-M into an English sentence.
    smoothed: "My name is Sam.",
    tokens: [
      { kind: "sign", value: "MY", confidence: 0.9 },
      { kind: "sign", value: "NAME", confidence: 0.74 },
      { kind: "letter", value: "S", confidence: 0.66 },
      { kind: "letter", value: "A", confidence: 0.93 },
      { kind: "letter", value: "M", confidence: 0.69 },
    ],
  },
  {
    smoothed: "Nice to meet you.",
    tokens: [
      { kind: "sign", value: "GOOD", confidence: 0.87 },
      { kind: "sign", value: "YOU", confidence: 0.89 },
    ],
  },
  {
    smoothed: "Thank you.",
    tokens: [{ kind: "sign", value: "THANK-YOU", confidence: 0.7 }],
  },
];

/** Milliseconds a single letter is held before the next token arrives. */
export const MOCK_LETTER_MS = 620;

/** A word sign is a movement, so it takes longer than a held letter. */
export const MOCK_SIGN_MS = 940;

/** Milliseconds of pause that closes a phrase and triggers smoothing. */
export const MOCK_PHRASE_PAUSE_MS = 1100;
