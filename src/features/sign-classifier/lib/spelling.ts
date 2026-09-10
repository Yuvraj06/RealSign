/**
 * Turns a stream of per-frame guesses into letters and phrases.
 *
 * The model reads one frame at a time and has no idea it is being asked the
 * same question thirty times a second. Fingerspelling is a held shape, so the
 * useful signal is agreement over time, not any single frame: a letter is
 * committed once the same guess has survived a few samples at reasonable
 * confidence, which throws away the garbage produced while the hand is moving
 * between two shapes.
 *
 * Kept as a plain state machine rather than as React state because it is the
 * part most likely to need tuning against real signing, and it is much easier
 * to reason about — and to test — when it has no hooks in it.
 */

import type { LetterReading, SpellingEvent, SpellingState } from "../types";

/** Samples per second the interpreter feeds this. Mirrors the recorder's rate. */
export const SAMPLE_INTERVAL_MS = 100;

/**
 * Agreeing samples before a letter is committed.
 *
 * At 100ms apart this is 400ms of holding still. Lower and the transitions
 * between two letters commit a third one on the way past; higher and
 * fingerspelling at any natural speed stops registering.
 */
const STABLE_SAMPLES = 4;

/** Mean confidence across those samples, below which nothing is committed. */
const MIN_CONFIDENCE = 0.75;

/**
 * Samples of something else before the same letter may be committed again.
 *
 * Without this, holding a shape emits it once per sample. With it, a doubled
 * letter has to be signed as two deliberate holds — which is a real cost, and
 * it is the same cost a person reading fingerspelling pays.
 */
const RELEASE_SAMPLES = 2;

/** Samples with no usable hand that close the phrase. 1.2 seconds. */
const PHRASE_PAUSE_SAMPLES = 12;

export function createSpellingState(): SpellingState {
  return {
    candidate: null,
    agreeing: 0,
    confidenceTotal: 0,
    latched: null,
    releasing: 0,
    absent: 0,
    open: false,
  };
}

/**
 * Feeds one sample in and returns whatever it completed.
 *
 * `reading` is null when there was no usable hand in the frame — no hand at
 * all, a hand half out of shot, or one the normalizer refused. All three mean
 * the same thing here: nothing to read, and a pause running.
 *
 * Mutates `state` and returns the events it produced, usually none.
 */
export function pushSample(
  state: SpellingState,
  reading: LetterReading | null,
): SpellingEvent[] {
  const events: SpellingEvent[] = [];

  if (!reading) {
    state.candidate = null;
    state.agreeing = 0;
    state.confidenceTotal = 0;
    state.absent += 1;

    // A hand out of frame is the clearest possible release: whatever was held
    // is over, so the next appearance of the same letter is a new one.
    if (state.absent >= RELEASE_SAMPLES) {
      state.latched = null;
      state.releasing = 0;
    }

    if (state.open && state.absent >= PHRASE_PAUSE_SAMPLES) {
      state.open = false;
      events.push({ type: "phrase" });
    }

    return events;
  }

  state.absent = 0;

  if (reading.letter === state.candidate) {
    state.agreeing += 1;
    state.confidenceTotal += reading.confidence;
  } else {
    state.candidate = reading.letter;
    state.agreeing = 1;
    state.confidenceTotal = reading.confidence;
  }

  // The latch clears once the hand has convincingly moved on, so that L-L is
  // reachable by re-forming the shape rather than by holding it longer.
  if (state.latched !== null && reading.letter !== state.latched) {
    state.releasing += 1;
    if (state.releasing >= RELEASE_SAMPLES) {
      state.latched = null;
      state.releasing = 0;
    }
  } else if (reading.letter === state.latched) {
    state.releasing = 0;
  }

  if (
    state.agreeing >= STABLE_SAMPLES &&
    state.candidate !== state.latched &&
    state.confidenceTotal / state.agreeing >= MIN_CONFIDENCE
  ) {
    events.push({
      type: "letter",
      value: state.candidate,
      // The mean over the agreeing samples, not the last one, so a single
      // lucky frame cannot present itself as certainty.
      confidence: state.confidenceTotal / state.agreeing,
    });

    state.latched = state.candidate;
    state.releasing = 0;
    state.agreeing = 0;
    state.confidenceTotal = 0;
    state.open = true;
  }

  return events;
}
