// Types for the sign-classifier slice (TensorFlow.js model inference over hand landmarks).

import type { RecognizedToken, TranscriptEntry } from "@/shared/types";

/** One scripted phrase used by the mock recognizer in Phase 1. */
export interface MockPhrase {
  tokens: Array<Pick<RecognizedToken, "kind" | "value" | "confidence">>;
  /** What the smoothing step is expected to return for these tokens. */
  smoothed: string;
}

/** Everything the interpreter UI needs from a recognizer, mock or real. */
export interface RecognizerState {
  /** Tokens of the phrase currently being signed. */
  tokens: RecognizedToken[];
  /** Confidence of the most recent token, or null before the first one. */
  confidence: number | null;
  /** Smoothed sentence built from the finished phrase. */
  sentence: string;
  /** One entry per finished phrase. */
  transcript: TranscriptEntry[];
}
