import type { SampleBank } from "../types";
import { loadDataset, saveDataset } from "./dataset";

/**
 * The recorded samples, as an external store.
 *
 * They live in localStorage, which the server cannot see, so reading them with
 * `useSyncExternalStore` is what keeps the first client render agreeing with
 * the server render instead of hydrating into a mismatch.
 */
const EMPTY: SampleBank = {};

let bank: SampleBank | null = null;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): SampleBank {
  bank ??= loadDataset();
  return bank;
}

/** Nothing is recorded as far as the server knows, and it never will be. */
export function getServerSnapshot(): SampleBank {
  return EMPTY;
}

/**
 * Replaces the bank and writes it through to storage.
 * Returns false when the quota rejected the write, so the caller can say so.
 */
export function commit(next: SampleBank): boolean {
  bank = next;
  const saved = saveDataset(next);
  for (const listener of listeners) listener();
  return saved;
}
