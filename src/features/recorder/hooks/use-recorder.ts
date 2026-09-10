"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useHandTracking } from "@/features/hand-tracking/hooks";
import { isFullyVisible, normalizeHand } from "@/features/hand-tracking/lib";
import {
  BURST_SIZE,
  buildExport,
  clearDataset,
  countSamples,
  mergeSamples,
  parseImport,
  stepLetter,
} from "../lib";
import { commit, getServerSnapshot, getSnapshot, subscribe } from "../lib/store";
import type { CapturePhase, SampleBank } from "../types";

/**
 * Seconds between pressing record and the first frame being kept, so the
 * hand that gets recorded is the one signing rather than the one leaving the
 * keyboard.
 */
const COUNTDOWN_SECONDS = 3;

/**
 * Milliseconds between kept frames.
 *
 * The camera runs at 30fps, but thirty samples of one held pose are thirty
 * copies of the same numbers, and a training set full of duplicates teaches
 * the model that this exact hand at this exact distance is the letter. Ten a
 * second is slow enough that natural drift makes each one different.
 */
const SAMPLE_INTERVAL_MS = 100;

/** Enough precision for values measured in hand-widths; keeps storage small. */
const PRECISION = 1e4;

export function useRecorder() {
  const [letter, setLetter] = useState("A");
  const [phase, setPhase] = useState<CapturePhase>("idle");
  const [countdown, setCountdown] = useState(0);
  const [captured, setCaptured] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  const bank = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // The camera waits to be asked, even here. Opening it on page load would
  // prompt for permission before the person has said what they came to do.
  const [cameraOn, setCameraOn] = useState(false);
  const tracking = useHandTracking(cameraOn);
  const { landmarksRef, handedness } = tracking;

  /**
   * Read inside the capture interval, which is not re-created when the hand
   * changes, so the live value has to reach it through a ref.
   */
  const handednessRef = useRef(handedness);
  useEffect(() => {
    handednessRef.current = handedness;
  }, [handedness]);

  /** The burst in progress, held out of state so it does not re-render. */
  const burst = useRef<number[][]>([]);
  /**
   * The letter the burst was started for. A burst belongs to whatever was on
   * screen when recording began, even if the selection changes before it is
   * stopped: mislabelled samples are worse than no samples.
   */
  const burstLetter = useRef(letter);

  /**
   * The capture interval closes over `stop`, but is not re-created when
   * `stop` changes, so it reaches the current one through a ref.
   */
  const stopRef = useRef<() => void>(() => {});
  /** What the last committed burst added, so it can be taken back. */
  const [lastBurst, setLastBurst] = useState<{
    letter: string;
    count: number;
  } | null>(null);

  // Counting down.
  useEffect(() => {
    if (phase !== "counting") return;

    let remaining = COUNTDOWN_SECONDS;
    const id = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
        return;
      }
      clearInterval(id);
      setCountdown(0);
      setPhase("recording");
    }, 1000);

    return () => clearInterval(id);
  }, [phase]);

  // Recording.
  useEffect(() => {
    if (phase !== "recording") return;

    const id = setInterval(() => {
      const hand = landmarksRef.current;

      // A hand half out of frame has landmarks MediaPipe guessed rather than
      // saw. Those are the samples that poison a training set.
      if (!hand || !isFullyVisible(hand)) {
        setRejected((count) => count + 1);
        return;
      }

      // Left hands are reflected into right-hand space, so a sample is the
      // same numbers whichever hand made it.
      const normalized = normalizeHand(hand, handednessRef.current ?? "right");
      if (!normalized) {
        setRejected((count) => count + 1);
        return;
      }

      burst.current.push(
        normalized.values.map((value) => Math.round(value * PRECISION) / PRECISION),
      );
      setCaptured(burst.current.length);

      // A full burst ends itself, so the hand can stay in the shape until the
      // count says it is done instead of reaching back to the keyboard.
      if (burst.current.length >= BURST_SIZE) stopRef.current();
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [phase, landmarksRef]);

  const startCamera = useCallback(() => setCameraOn(true), []);

  const start = useCallback(() => {
    burst.current = [];
    burstLetter.current = letter;
    setCaptured(0);
    setRejected(0);
    setNotice(null);
    setCountdown(COUNTDOWN_SECONDS);
    setPhase("counting");
  }, [letter]);

  const stop = useCallback(() => {
    setPhase("idle");
    setCountdown(0);

    const taken = burst.current;
    const target = burstLetter.current;
    burst.current = [];
    if (taken.length === 0) return;

    const next: SampleBank = {
      ...bank,
      [target]: [...(bank[target] ?? []), ...taken],
    };

    if (commit(next)) {
      setLastBurst({ letter: target, count: taken.length });
      setNotice(
        taken.length >= BURST_SIZE
          ? `${taken.length} samples of ${target}. Press next for ${stepLetter(target, 1)}.`
          : `${taken.length} samples of ${target}, stopped early.`,
      );
    } else {
      setLastBurst(null);
      setNotice(
        "Browser storage is full. Export what you have, then clear it to keep going.",
      );
    }
  }, [bank]);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  /** Moves along the run, skipping the letters this model cannot hold. */
  const step = useCallback((direction: number) => {
    setNotice(null);
    setLetter((current) => stepLetter(current, direction));
  }, []);

  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  /** Drops the burst just recorded. The fastest fix for one bad take. */
  const undoBurst = useCallback(() => {
    if (!lastBurst) return;

    const list = bank[lastBurst.letter] ?? [];
    commit({ ...bank, [lastBurst.letter]: list.slice(0, -lastBurst.count) });
    setLastBurst(null);
    setNotice(
      `Removed the last ${lastBurst.count} samples of ${lastBurst.letter}.`,
    );
  }, [bank, lastBurst]);

  const clearAll = useCallback(() => {
    clearDataset();
    commit({});
    setLastBurst(null);
    setNotice("Cleared everything.");
  }, []);

  const exportDataset = useCallback(() => {
    const data = buildExport(bank);
    if (data.total === 0) return;

    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `realsign-letters-${data.total}.json`;
    link.click();

    URL.revokeObjectURL(url);
    setNotice(`Exported ${data.total} samples.`);
  }, [bank]);

  const importDataset = useCallback(
    async (file: File) => {
      try {
        const incoming = parseImport(await file.text());
        const merged = mergeSamples(bank, incoming);
        const added = countSamples(merged) - countSamples(bank);

        if (commit(merged)) {
          setLastBurst(null);
          setNotice(`Added ${added} samples from ${file.name}.`);
        } else {
          setNotice("Browser storage is full, so the import was not kept.");
        }
      } catch {
        setNotice(`${file.name} is not a realsign dataset.`);
      }
    },
    [bank],
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(bank).map(([key, list]) => [key, list.length]),
      ),
    [bank],
  );

  return {
    tracking,
    startCamera,
    letter,
    setLetter,
    phase,
    countdown,
    captured,
    rejected,
    notice,
    counts,
    total: countSamples(bank),
    canUndo: lastBurst !== null,
    start,
    stop,
    next,
    previous,
    undoBurst,
    clearAll,
    exportDataset,
    importDataset,
  };
}
