// Types for the recorder slice (Phase 3: capturing training data).

/**
 * Samples, keyed by letter.
 *
 * Each sample is one normalized frame: 63 values in the order
 * `normalizeHand` produces. Stored as bare number arrays rather than objects
 * because there are tens of thousands of them and they go through
 * localStorage.
 */
export type SampleBank = Record<string, number[][]>;

/** What is held in browser storage between sessions. */
export interface StoredDataset {
  version: 1;
  updatedAt: string;
  samples: SampleBank;
}

/**
 * What gets written to disk.
 *
 * Carries enough description of how the numbers were made that the training
 * script cannot silently disagree with the browser about it.
 */
export interface ExportedDataset extends StoredDataset {
  kind: "letters";
  /** Values per sample. 63: 21 landmarks of x, y, z. */
  featureLength: number;
  /** Human-readable record of the transform the values already went through. */
  normalization: string;
  /** Samples per letter, so a training script can check its own parsing. */
  counts: Record<string, number>;
  total: number;
}

/** What the capture loop is doing. */
export type CapturePhase = "idle" | "counting" | "recording";
