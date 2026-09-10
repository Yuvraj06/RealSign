"use client";

import { useCallback, useState } from "react";
import { useHandTracking } from "@/features/hand-tracking/hooks";
import { useLetterRecognizer } from "@/features/sign-classifier/hooks";
import type { InterpreterStatus } from "@/shared/types";
import type { InterpreterViewModel } from "../types";

/** What the user has asked for, as opposed to what the camera has managed. */
type Intent = "idle" | "running" | "paused";

/**
 * Everything the two panels need, from one place.
 *
 * The seam this keeps is between seeing and reading: the tracker produces
 * landmarks and knows nothing about letters, the recognizer names them and
 * knows nothing about cameras. Neither panel has to know which half it is
 * looking at.
 */
export function useInterpreter(): InterpreterViewModel {
  const [intent, setIntent] = useState<Intent>("idle");

  const tracking = useHandTracking(intent === "running");
  // Reading follows the feed, not the button, so the model never starts loading
  // for a camera that has failed to open, and nothing is ever shown as read from
  // one that is still starting.
  const live = tracking.phase === "tracking";
  const recognizer = useLetterRecognizer(live, tracking);

  const { phase, retry } = tracking;
  const { clear: clearReading } = recognizer;

  const start = useCallback(() => {
    if (phase === "faulted") retry();
    setIntent("running");
  }, [phase, retry]);

  const pause = useCallback(() => setIntent("paused"), []);

  const clear = useCallback(() => {
    setIntent("idle");
    clearReading();
  }, [clearReading]);

  /**
   * The camera decides between starting and reading; the user's intent decides
   * between idle and paused. A feed that is live but still fetching the weights
   * counts as starting, because pressing nothing and seeing "reading" while no
   * letter can possibly land is worse than a moment more of "starting camera".
   * A fault reads as idle, because the panel is already explaining what went
   * wrong and the pill should not repeat it.
   */
  const status: InterpreterStatus =
    phase === "starting"
      ? "starting"
      : live
        ? recognizer.ready
          ? "reading"
          : "starting"
        : intent === "paused"
          ? "paused"
          : "idle";

  return {
    status,
    tokens: recognizer.tokens,
    confidence: recognizer.confidence,
    sentence: recognizer.sentence,
    transcript: recognizer.transcript,
    modelFault: recognizer.fault,
    tracking,
    start,
    pause,
    clear,
  };
}
