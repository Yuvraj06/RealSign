// Types for the interpreter slice (the two-panel reading screen).

import type { HandTracking } from "@/features/hand-tracking/types";
import type { RecognizerFault } from "@/features/sign-classifier/types";
import type {
  InterpreterStatus,
  RecognizedToken,
  TranscriptEntry,
} from "@/shared/types";

/** Everything the two panels need, plus the controls that drive them. */
export interface InterpreterViewModel {
  status: InterpreterStatus;
  tokens: RecognizedToken[];
  confidence: number | null;
  sentence: string;
  transcript: TranscriptEntry[];
  /** Set when the letter model failed to load, which the camera cannot explain. */
  modelFault: RecognizerFault | null;
  /** Camera and landmark state for the left panel. */
  tracking: HandTracking;
  start: () => void;
  pause: () => void;
  clear: () => void;
}
