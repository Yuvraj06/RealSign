"use client";

import { useCallback, useState } from "react";
import { useHandTracking } from "@/features/hand-tracking/hooks";
import { useMockRecognizer } from "@/features/sign-classifier/hooks";
import type { InterpreterStatus } from "@/shared/types";
import type { InterpreterViewModel } from "../types";

/** What the user has asked for, as opposed to what the camera has managed. */
type Intent = "idle" | "running" | "paused";

/**
 * Everything the two panels need, from one place.
 *
 * The camera and the landmarks are real. What those landmarks are read as is
 * still the Phase 1 script, because the classifier does not exist yet. Keeping
 * that seam here means the panels never have to know which half is which.
 */
export function useInterpreter(): InterpreterViewModel {
  const [intent, setIntent] = useState<Intent>("idle");

  const tracking = useHandTracking(intent === "running");
  // Reading follows the feed, not the button, so nothing is ever shown as read
  // from a camera that is still starting or has failed to start.
  const recognizer = useMockRecognizer(tracking.phase === "tracking");

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
   * between idle and paused. A fault reads as idle, because the panel is
   * already explaining what went wrong and the pill should not repeat it.
   */
  const status: InterpreterStatus =
    phase === "starting"
      ? "starting"
      : phase === "tracking"
        ? recognizer.activeKind === "sign"
          ? "sign"
          : "reading"
        : intent === "paused"
          ? "paused"
          : "idle";

  return {
    status,
    tokens: recognizer.tokens,
    confidence: recognizer.confidence,
    sentence: recognizer.sentence,
    transcript: recognizer.transcript,
    tracking,
    start,
    pause,
    clear,
  };
}
