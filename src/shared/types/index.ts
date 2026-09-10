// Cross-slice shared types.

/**
 * What the interpreter is doing right now. Mirrors the status pill copy.
 * `sign` is separate from `reading` because a movement burst produces one
 * chip where a held pose produces one letter, and users need to see which
 * happened. `starting` covers the seconds between pressing the button and
 * the first tracked frame, which is long enough to need saying.
 */
export type InterpreterStatus =
  | "idle"
  | "starting"
  | "reading"
  | "sign"
  | "paused";

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
