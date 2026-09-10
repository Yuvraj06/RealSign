"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  TrackingError,
  closeCamera,
  loadHandLandmarker,
  openCamera,
  readHandedness,
  waitForFrames,
} from "../lib";
import type {
  HandLandmarks,
  HandTracking,
  Handedness,
  TrackingFault,
  TrackingPhase,
} from "../types";

/**
 * A hand is called gone only after this long without one, so a single missed
 * frame does not flicker the interface.
 */
const ABSENCE_GRACE_MS = 400;

/** How often the frame rate readout is allowed to change. */
const FPS_WINDOW_MS = 1000;

/**
 * Webcam in, 21 landmarks out.
 *
 * Owns the whole Phase 2 pipeline: camera permission, the MediaPipe runtime,
 * and the detection loop. It deliberately produces landmarks and nothing else.
 * Naming what the hand is doing belongs to the classifier, later.
 */
export function useHandTracking(enabled: boolean): HandTracking {
  const videoRef = useRef<HTMLVideoElement>(null);
  const landmarksRef = useRef<HandLandmarks | null>(null);

  const [phase, setPhase] = useState<TrackingPhase>("off");
  const [fault, setFault] = useState<TrackingFault | null>(null);
  const [fps, setFps] = useState(0);
  const [handPresent, setHandPresent] = useState(false);
  const [handedness, setHandedness] = useState<Handedness | null>(null);

  /** Bumped by `retry` to re-run the effect after a fault. */
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setFault(null);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Captured once: the element the cleanup has to release is the one this
    // run attached a stream to, not whatever the ref holds later.
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let frame = 0;

    const run = async () => {
      setPhase("starting");
      setFault(null);

      try {
        // The camera prompt goes first: there is no point downloading 19MB of
        // tracker for someone who is about to say no.
        const stream = await openCamera();
        if (cancelled) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }

        video.srcObject = stream;
        await video.play();
        await waitForFrames(video);
        if (cancelled) return;

        const landmarker = await loadHandLandmarker().catch(() => {
          throw new TrackingError("model");
        });
        if (cancelled) return;

        setPhase("tracking");

        let lastFrameTime = -1;
        let seenAt = 0;
        let present = false;
        let side: Handedness | null = null;
        let reportedSide: Handedness | null = null;
        let counted = 0;
        let windowStart = performance.now();

        const detect = () => {
          frame = requestAnimationFrame(detect);

          const now = performance.now();
          if (video.readyState < 2) return;

          // The camera runs at 30fps and the display at 60 or more, so most
          // animation frames carry a picture we have already read.
          if (video.currentTime === lastFrameTime) return;
          lastFrameTime = video.currentTime;

          const result = landmarker.detectForVideo(video, now);
          const hand = result.landmarks[0];
          landmarksRef.current = hand ?? null;

          if (hand) {
            seenAt = now;
            // Keep the last confident answer if this frame had no opinion:
            // the hand did not swap, the classifier just hesitated.
            side = readHandedness(result.handedness[0]) ?? side;
          }

          const nowPresent = Boolean(hand) || now - seenAt < ABSENCE_GRACE_MS;
          if (nowPresent !== present) {
            present = nowPresent;
            setHandPresent(nowPresent);
          }

          if (!nowPresent) side = null;
          if (side !== reportedSide) {
            reportedSide = side;
            setHandedness(side);
          }

          counted += 1;
          const elapsed = now - windowStart;
          if (elapsed >= FPS_WINDOW_MS) {
            setFps(Math.round((counted * 1000) / elapsed));
            counted = 0;
            windowStart = now;
          }
        };

        frame = requestAnimationFrame(detect);
      } catch (error) {
        if (cancelled) return;
        setFault(error instanceof TrackingError ? error.fault : "unavailable");
        setPhase("faulted");
      }
    };

    void run();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      closeCamera(video);
      landmarksRef.current = null;
      setPhase("off");
      setHandPresent(false);
      setHandedness(null);
      setFps(0);
    };
  }, [enabled, attempt]);

  return {
    videoRef,
    landmarksRef,
    phase,
    fault,
    fps,
    handPresent,
    handedness,
    retry,
  };
}
