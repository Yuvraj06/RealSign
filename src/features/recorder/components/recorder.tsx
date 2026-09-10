"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Panel } from "@/shared/components";
import { cn } from "@/shared/lib";
import { useRecorder } from "../hooks";
import {
  ALPHABET,
  BURST_SIZE,
  RECORDABLE,
  SAMPLES_MIN,
  SAMPLES_TARGET,
} from "../lib";
import { CapturePanel } from "./capture-panel";
import { LetterGrid } from "./letter-grid";

export function Recorder() {
  const recorder = useRecorder();
  const {
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
    total,
    canUndo,
    start,
    stop,
    next,
    previous,
    undoBurst,
    clearAll,
    exportDataset,
    importDataset,
  } = recorder;

  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const live = tracking.phase === "tracking";
  const recording = phase !== "idle";
  const target = ALPHABET.find((entry) => entry.letter === letter);
  const count = counts[letter] ?? 0;
  const done = count >= SAMPLES_MIN;

  const toggle = useCallback(() => {
    if (recording) stop();
    else if (live) start();
  }, [recording, live, start, stop]);

  /**
   * One hand is signing, so the other one drives the tool from the keyboard.
   * Reaching for a button between every burst is what makes a recording
   * session take twice as long as it needs to.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.tagName === "INPUT") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.code === "Space") {
        // Also stops Space from re-triggering whichever button has focus.
        event.preventDefault();
        toggle();
        return;
      }

      if (phase !== "idle") return;

      if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") previous();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle, next, previous, phase]);

  // A second thought about wiping an afternoon of recording is a good thing.
  useEffect(() => {
    if (!confirmingClear) return;
    const id = setTimeout(() => setConfirmingClear(false), 4000);
    return () => clearTimeout(id);
  }, [confirmingClear]);

  const onClear = useCallback(() => {
    if (confirmingClear) {
      clearAll();
      setConfirmingClear(false);
    } else {
      setConfirmingClear(true);
    }
  }, [confirmingClear, clearAll]);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-title font-semibold text-forest">
            letter recorder
          </h1>
          <p className="measure mt-1 font-body text-body text-forest/75">
            Records normalized landmark frames for the letter model. The same
            normalization runs here and at inference, which is the whole reason
            to record through this page rather than from video.
          </p>
        </div>

        <Link
          href="/"
          className="rounded-full px-4 py-2 font-body text-body font-semibold text-forest transition-colors hover:text-green"
        >
          back to realsign
        </Link>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <CapturePanel
          tracking={tracking}
          letter={letter}
          phase={phase}
          countdown={countdown}
          captured={captured}
          rejected={rejected}
          onStartCamera={startCamera}
        />

        <Panel className="flex flex-col gap-7 p-7">
          <section aria-labelledby="target-heading">
            <h2
              id="target-heading"
              className="font-body text-caption text-forest/75"
            >
              recording
            </h2>

            <div className="mt-2 flex items-baseline gap-4">
              <span className="font-display text-display font-semibold text-forest">
                {letter}
              </span>
              <span className="font-body text-lead tabular-nums text-forest/75">
                {phase === "recording"
                  ? `${count} + ${captured}`
                  : count}{" "}
                / {SAMPLES_TARGET}
              </span>
            </div>

            <div
              role="meter"
              aria-valuenow={count}
              aria-valuemin={0}
              aria-valuemax={SAMPLES_TARGET}
              aria-label={`Samples recorded for ${letter}`}
              className="mt-3 h-2 w-full overflow-hidden rounded-full bg-sage"
            >
              <div
                className="h-full rounded-full bg-green transition-[width] duration-300"
                style={{
                  width: `${Math.min(100, ((count + (phase === "recording" ? captured : 0)) / SAMPLES_TARGET) * 100)}%`,
                }}
              />
            </div>

            <p className="measure mt-3 font-body text-caption text-forest/75">
              {done
                ? `Past ${SAMPLES_MIN}, which is enough to train on.`
                : `${SAMPLES_MIN} is the floor. Vary distance, angle and lighting between bursts.`}
              {target?.confusedWith
                ? ` Models confuse this one with ${target.confusedWith}, so it earns extra samples.`
                : ""}
            </p>

            {target?.motion ? (
              <p className="measure mt-3 rounded-chip bg-sage px-4 py-3 font-body text-caption text-forest">
                Skip {letter}. It is drawn in the air, and its handshape is
                already {letter === "J" ? "I" : "D"}
                &apos;s, so a held sample would land on top of that letter and
                damage it rather than teach {letter}. It belongs to the
                sequence model in phase 6, with the word signs. Next letter
                steps over it.
              </p>
            ) : null}
          </section>

          <section aria-labelledby="controls-heading">
            <h2 id="controls-heading" className="sr-only">
              capture controls
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              {recording ? (
                <Button variant="secondary" onClick={stop}>
                  {phase === "counting" ? "cancel" : "stop"}
                </Button>
              ) : (
                <Button onClick={start} disabled={!live}>
                  record {letter}
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={next}
                disabled={recording}
              >
                next letter
              </Button>
              <Button
                variant="quiet"
                onClick={undoBurst}
                disabled={!canUndo || recording}
              >
                undo last burst
              </Button>
            </div>

            <p className="measure mt-3 font-body text-caption text-forest/75">
              Space starts and stops, and a burst ends itself at {BURST_SIZE}.
              Arrows move between letters.
            </p>
          </section>

          <section aria-labelledby="dataset-heading" className="mt-auto">
            <h2
              id="dataset-heading"
              className="font-body text-caption text-forest/75"
            >
              dataset
            </h2>

            <p className="measure mt-2 font-body text-body text-forest">
              <span className="font-semibold tabular-nums">{total}</span> samples
              held in this browser.{" "}
              <span className="tabular-nums">
                {
                  RECORDABLE.filter(
                    (entry) => (counts[entry] ?? 0) >= SAMPLES_MIN,
                  ).length
                }
              </span>{" "}
              of {RECORDABLE.length} letters are past {SAMPLES_MIN}.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button variant="quiet" onClick={exportDataset} disabled={total === 0}>
                export json
              </Button>
              <Button
                variant="quiet"
                onClick={() => fileInput.current?.click()}
              >
                import
              </Button>
              <Button
                variant="quiet"
                onClick={onClear}
                disabled={total === 0}
                className={cn(confirmingClear && "bg-clay/15 text-clay")}
              >
                {confirmingClear ? `clear all ${total}?` : "clear"}
              </Button>

              <input
                ref={fileInput}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  // Reset so choosing the same file twice fires again.
                  event.target.value = "";
                  if (file) void importDataset(file);
                }}
              />
            </div>

            <p
              aria-live="polite"
              className="measure mt-3 min-h-[1.4em] font-body text-caption text-forest/75"
            >
              {notice}
            </p>
          </section>
        </Panel>
      </div>

      <section aria-labelledby="alphabet-heading" className="mt-10">
        <h2
          id="alphabet-heading"
          className="font-body text-caption text-forest/75"
        >
          alphabet
        </h2>
        <div className="mt-3">
          <LetterGrid
            selected={letter}
            counts={counts}
            onSelect={setLetter}
            disabled={recording}
          />
        </div>
        <p className="measure mt-4 font-body text-caption text-forest/75">
          An asterisk marks the two letters that are drawn rather than held.
          They are skipped: a single-frame model has nowhere to put them.
        </p>
      </section>
    </div>
  );
}
