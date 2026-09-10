"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isFullyVisible, normalizeHand } from "@/features/hand-tracking/lib";
import type { HandTracking } from "@/features/hand-tracking/types";
import type { RecognizedToken, TranscriptEntry } from "@/shared/types";
import { classifyLetter, loadLetterModel } from "../lib/letter-model";
import { SAMPLE_INTERVAL_MS, createSpellingState, pushSample } from "../lib/spelling";
import type { LetterModel, RecognizerFault, RecognizerState } from "../types";

/**
 * Reads fingerspelling off the camera.
 *
 * Samples the tracker on a fixed interval rather than on every camera frame,
 * for the same reason the recorder does: the stability window in `spelling.ts`
 * is counted in samples, so it has to mean the same length of time whether the
 * webcam is managing 30fps or 12.
 *
 * Loading starts as soon as the feed is live, so the weights arrive while the
 * user is still getting their hand into frame.
 *
 * @param running Whether frames are actually arriving from the camera.
 * @param tracking The tracker, for its landmarks and its handedness.
 */
export function useLetterRecognizer(
  running: boolean,
  tracking: HandTracking,
): RecognizerState & { clear: () => void } {
  const [tokens, setTokens] = useState<RecognizedToken[]>([]);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [sentence, setSentence] = useState("");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [fault, setFault] = useState<RecognizerFault | null>(null);
  const [ready, setReady] = useState(false);

  const { landmarksRef, handedness } = tracking;

  /**
   * Handedness in a ref, so a hand changing does not tear down the sampling
   * loop and restart the stability count halfway through a letter.
   */
  const handednessRef = useRef(handedness);
  useEffect(() => {
    handednessRef.current = handedness;
  }, [handedness]);

  const modelRef = useRef<LetterModel | null>(null);
  const spelling = useRef(createSpellingState());

  /**
   * The phrase being spelled.
   *
   * A ref rather than state, and the state above mirrors it. The sampling loop
   * needs to read the tokens so far in order to close a phrase with them, and
   * reading that inside a `setState` updater would make the updater impure —
   * React is free to run those twice, which would append the phrase twice.
   */
  const phrase = useRef<RecognizedToken[]>([]);

  useEffect(() => {
    if (!running) return;

    let cancelled = false;

    loadLetterModel().then(
      (model) => {
        if (cancelled) return;
        modelRef.current = model;
        setFault(null);
        setReady(true);
      },
      () => {
        if (!cancelled) setFault("model");
      },
    );

    return () => {
      cancelled = true;
    };
  }, [running]);

  useEffect(() => {
    if (!running || !ready) return;

    // A fresh feed starts a fresh phrase: whatever was half-spelled before the
    // camera stopped is not part of what comes next.
    spelling.current = createSpellingState();
    phrase.current = [];

    const id = setInterval(() => {
      const model = modelRef.current;
      if (!model) return;

      const hand = landmarksRef.current;

      // A hand half out of frame has landmarks MediaPipe guessed rather than
      // saw, and the recorder rejected exactly those, so the model has never
      // seen one. Treated as no hand rather than read as a letter.
      const normalized =
        hand && isFullyVisible(hand)
          ? normalizeHand(hand, handednessRef.current ?? "right")
          : null;

      const reading = normalized ? classifyLetter(model, normalized.values) : null;

      for (const event of pushSample(spelling.current, reading)) {
        if (event.type === "letter") {
          phrase.current = [
            ...phrase.current,
            {
              // Position and value together, so the same letter twice in one
              // phrase still animates as two chips.
              id: `${phrase.current.length}-${event.value}`,
              kind: "letter",
              value: event.value,
              confidence: event.confidence,
            },
          ];
          setTokens(phrase.current);
          setConfidence(event.confidence);
          setSentence("");
          continue;
        }

        // A pause closed the phrase. The tokens move to the transcript, and the
        // reading line keeps the finished word.
        const finished = phrase.current;
        if (finished.length === 0) continue;

        phrase.current = [];
        setTokens([]);
        setConfidence(null);
        setSentence(spell(finished));
        setTranscript((entries) => [
          ...entries,
          {
            id: `${entries.length}-${finished.length}`,
            raw: finished.map((token) => token.value).join(" "),
            // There is no smoothing step yet, so the reading is the letters as
            // spelled. Guessing an English word here would be inventing one.
            smoothed: spell(finished),
          },
        ]);
      }
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(id);
  }, [running, ready, landmarksRef]);

  const clear = useCallback(() => {
    spelling.current = createSpellingState();
    phrase.current = [];
    setTokens([]);
    setConfidence(null);
    setSentence("");
    setTranscript([]);
  }, []);

  return { tokens, confidence, sentence, transcript, fault, ready, clear };
}

/** Letters run together, the way a spelled word is read back. */
function spell(tokens: RecognizedToken[]): string {
  return tokens.map((token) => token.value).join("");
}
