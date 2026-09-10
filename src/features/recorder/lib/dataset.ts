import { FEATURE_LENGTH } from "@/features/hand-tracking/lib";
import type { ExportedDataset, SampleBank, StoredDataset } from "../types";

const STORAGE_KEY = "realsign.letters.v1";

/**
 * Recording a full alphabet takes a long sitting, so the work survives a
 * refresh, a closed tab, and a crashed dev server. localStorage is enough:
 * a full 26-letter set lands around 900KB, well inside the quota.
 */
export function loadDataset(): SampleBank {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed: unknown = JSON.parse(raw);
    return readSamples(parsed);
  } catch {
    // Corrupt or unreadable. Starting empty beats refusing to load the page.
    return {};
  }
}

/** Returns false when the quota is full, so the caller can say so out loud. */
export function saveDataset(samples: SampleBank): boolean {
  try {
    const stored: StoredDataset = {
      version: 1,
      updatedAt: new Date().toISOString(),
      samples,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}

export function clearDataset() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do. The in-memory state is the source of truth either way.
  }
}

export function countSamples(samples: SampleBank) {
  return Object.values(samples).reduce((total, list) => total + list.length, 0);
}

export function countsByLetter(samples: SampleBank): Record<string, number> {
  return Object.fromEntries(
    Object.entries(samples).map(([letter, list]) => [letter, list.length]),
  );
}

/** Builds the file that `training/train_letters.py` reads. */
export function buildExport(samples: SampleBank): ExportedDataset {
  return {
    version: 1,
    kind: "letters",
    updatedAt: new Date().toISOString(),
    featureLength: FEATURE_LENGTH,
    normalization:
      "left hands reflected about x to right-hand space; " +
      "wrist translated to origin; scaled so wrist-to-middle-MCP is 1; " +
      "rotated in the image plane so that vector points at -pi/2; " +
      "flattened as 21 points of x, y, z",
    counts: countsByLetter(samples),
    total: countSamples(samples),
    samples,
  };
}

/**
 * Reads a previously exported file back in.
 *
 * Sessions get split across days and machines, and a cleared browser cache
 * should not cost an afternoon of recording. Everything unrecognizable is
 * dropped rather than trusted, because a malformed row here becomes a silent
 * training bug much later.
 */
export function parseImport(text: string): SampleBank {
  const parsed: unknown = JSON.parse(text);
  const samples = readSamples(parsed);

  if (Object.keys(samples).length === 0) {
    throw new Error("No usable samples in that file.");
  }

  return samples;
}

/** Adds imported samples to what is already recorded, keeping both. */
export function mergeSamples(into: SampleBank, from: SampleBank): SampleBank {
  const merged: SampleBank = { ...into };

  for (const [letter, list] of Object.entries(from)) {
    merged[letter] = [...(merged[letter] ?? []), ...list];
  }

  return merged;
}

/** Accepts a stored or exported shape; both keep samples in the same place. */
function readSamples(parsed: unknown): SampleBank {
  if (!parsed || typeof parsed !== "object") return {};

  const bank = (parsed as { samples?: unknown }).samples;
  if (!bank || typeof bank !== "object") return {};

  const samples: SampleBank = {};

  for (const [letter, list] of Object.entries(bank as Record<string, unknown>)) {
    if (!Array.isArray(list)) continue;

    const valid = list.filter(
      (sample): sample is number[] =>
        Array.isArray(sample) &&
        sample.length === FEATURE_LENGTH &&
        sample.every((value) => typeof value === "number" && isFinite(value)),
    );

    if (valid.length > 0) samples[letter] = valid;
  }

  return samples;
}
