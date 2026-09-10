// Types for the sign-classifier slice (dense letter model over hand landmarks).

import type { RecognizedToken, TranscriptEntry } from "@/shared/types";

/** One layer of the dense network, as `training/train_letters.py` writes it. */
export interface LetterLayerFile {
  /** Flattened input-major, so row `i` is the weights leaving input `i`. */
  weight: number[];
  bias: number[];
  in: number;
  out: number;
}

/** The shape of `models/letters.json`. */
export interface LetterModelFile {
  version: number;
  kind: string;
  letters: string[];
  featureLength: number;
  /** Accuracy on the frames held out of training. See the training script. */
  heldOutAccuracy: number;
  activation: string;
  mean: number[];
  std: number[];
  layers: LetterLayerFile[];
}

/** The same layer, once it is typed arrays and ready to multiply. */
export interface LetterLayer {
  weight: Float32Array;
  bias: Float32Array;
  inputs: number;
  outputs: number;
}

/** The parsed model. */
export interface LetterModel {
  letters: string[];
  featureLength: number;
  heldOutAccuracy: number;
  mean: Float32Array;
  std: Float32Array;
  layers: LetterLayer[];
}

/** What the model made of a single frame. */
export interface LetterReading {
  letter: string;
  /** 0 to 1, softmax over the 24 letters. */
  confidence: number;
}

/** Everything `pushSample` needs to remember between frames. */
export interface SpellingState {
  /** The letter currently accumulating agreement, or null. */
  candidate: string | null;
  agreeing: number;
  confidenceTotal: number;
  /** The last committed letter, which must be released before it repeats. */
  latched: string | null;
  releasing: number;
  absent: number;
  /** Whether a phrase is in progress, so a pause has something to close. */
  open: boolean;
}

/** What a sample completed: a letter landed, or a pause closed the phrase. */
export type SpellingEvent =
  | { type: "letter"; value: string; confidence: number }
  | { type: "phrase" };

/** Why the recognizer is unusable. */
export type RecognizerFault = "model";

/** Everything the interpreter UI needs from the recognizer. */
export interface RecognizerState {
  /** Tokens of the phrase currently being spelled. */
  tokens: RecognizedToken[];
  /** Confidence of the most recent token, or null before the first one. */
  confidence: number | null;
  /** The finished phrase, or "" while one is in progress. */
  sentence: string;
  /** One entry per finished phrase. */
  transcript: TranscriptEntry[];
  /** Set when the model could not be loaded, which the camera cannot explain. */
  fault: RecognizerFault | null;
  /** False until the weights have arrived, so the UI can say it is loading. */
  ready: boolean;
}
