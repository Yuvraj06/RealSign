"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TokenKind } from "@/shared/types";
import {
  MOCK_LETTER_MS,
  MOCK_PHRASE_PAUSE_MS,
  MOCK_SCRIPT,
  MOCK_SIGN_MS,
} from "../lib/mock-script";
import { signLabel } from "../lib/vocabulary";
import type { RecognizerState } from "../types";

const EMPTY: RecognizerState = {
  tokens: [],
  confidence: null,
  sentence: "",
  transcript: [],
};

/**
 * Phase 1 stand-in for the real pipeline.
 *
 * Emits scripted tokens on a timer, pauses between phrases, and appends a
 * smoothed reading. The shape of what it returns is the contract the real
 * MediaPipe + TF.js + /api/smooth pipeline has to satisfy later, so the UI
 * built against it does not need to change.
 *
 * It runs while `running` is true, which the interpreter ties to frames
 * actually arriving from the camera rather than to the button being pressed.
 * The real recognizer will have the same relationship to the feed.
 */
export function useMockRecognizer(running: boolean) {
  const [state, setState] = useState<RecognizerState>(EMPTY);

  /** Position in the script: which phrase, and which token inside it. */
  const cursor = useRef({ phrase: 0, token: 0 });

  useEffect(() => {
    if (!running) return;

    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      const phrase = MOCK_SCRIPT[cursor.current.phrase];
      const next = phrase.tokens[cursor.current.token];

      if (next) {
        // Still inside a phrase: add one token.
        const index = cursor.current.token;
        const phraseIndex = cursor.current.phrase;
        cursor.current.token += 1;

        setState((prev) => ({
          ...prev,
          confidence: next.confidence,
          tokens: [
            ...prev.tokens,
            { ...next, id: `${phraseIndex}-${index}-${next.value}` },
          ],
        }));

        // A movement takes longer to produce than a held shape.
        timer = setTimeout(
          step,
          next.kind === "sign" ? MOCK_SIGN_MS : MOCK_LETTER_MS,
        );
        return;
      }

      // Phrase finished: the pause closes it and smoothing runs.
      const phraseIndex = cursor.current.phrase;
      cursor.current = {
        phrase: (phraseIndex + 1) % MOCK_SCRIPT.length,
        token: 0,
      };

      setState((prev) => {
        const raw = phrase.tokens
          .map((token) =>
            token.kind === "sign" ? signLabel(token.value) : token.value,
          )
          .join(" ");

        return {
          tokens: [],
          confidence: null,
          sentence: phrase.smoothed,
          transcript: [
            ...prev.transcript,
            {
              id: `${phraseIndex}-${prev.transcript.length}`,
              raw,
              smoothed: phrase.smoothed,
            },
          ],
        };
      });

      timer = setTimeout(step, MOCK_PHRASE_PAUSE_MS);
    };

    timer = setTimeout(step, MOCK_LETTER_MS);
    return () => clearTimeout(timer);
  }, [running]);

  const clear = useCallback(() => {
    cursor.current = { phrase: 0, token: 0 };
    setState(EMPTY);
  }, []);

  /**
   * What is being produced right now, or null between phrases. Read off the
   * last token rather than tracked separately, so there is one source of truth
   * for it. A sign matters to the caller because one movement produces one
   * chip where five held shapes would produce five.
   */
  const activeKind: TokenKind | null = running
    ? (state.tokens.at(-1)?.kind ?? null)
    : null;

  return { activeKind, clear, ...state };
}
