// Cross-slice shared types.

/**
 * What the interpreter is doing right now. Mirrors the status pill copy.
 *
 * `starting` covers the seconds between pressing the button and the first
 * letter being possible, which is the camera opening, MediaPipe loading and
 * the weights arriving — long enough to need saying. There is no separate
 * status for word signs, because there is no word-sign model yet.
 */
export type InterpreterStatus = "idle" | "starting" | "reading" | "paused";

/** A held handshape is a letter. A movement is a word sign. */
export type TokenKind = "letter" | "sign";

/** One thing the recognizer read, with its confidence. */
export interface RecognizedToken {
  /** Stable key so chips animate correctly when the same value repeats. */
  id: string;
  kind: TokenKind;
  /**
   * A single uppercase character for letters, or the sign gloss for signs,
   * for example `THANK-YOU`. Glosses are lowercased for display.
   */
  value: string;
  /** 0 to 1. Below CONFIDENCE_THRESHOLD the chip turns clay. */
  confidence: number;
}

/** One finished phrase: the raw tokens and the smoothed reading. */
export interface TranscriptEntry {
  id: string;
  raw: string;
  smoothed: string;
}
