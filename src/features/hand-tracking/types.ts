// Types for the hand-tracking slice (MediaPipe Tasks Vision hand landmark detection).

import type { RefObject } from "react";

/** One of the 21 MediaPipe hand landmarks, in normalized frame coordinates. */
export interface Landmark {
  /** 0 (left edge) to 1 (right edge) of the video frame. */
  x: number;
  /** 0 (top edge) to 1 (bottom edge) of the video frame. */
  y: number;
  /** Depth relative to the wrist, in roughly the same units as x. */
  z?: number;
}

/** A full hand: exactly 21 landmarks in MediaPipe's canonical order. */
export type HandLandmarks = Landmark[];

/** Which hand is in frame. */
export type Handedness = "left" | "right";

/** How far along the camera and the tracker are. */
export type TrackingPhase = "off" | "starting" | "tracking" | "faulted";

/**
 * Why there is no feed. Each one needs different words in the interface,
 * because the way forward is different: a denied permission is fixed in the
 * browser, a missing camera is not fixable here at all.
 */
export type TrackingFault =
  /** The user, or a browser policy, refused the camera. */
  | "denied"
  /** No camera, or another app is holding it. */
  | "unavailable"
  /** getUserMedia needs https or localhost. */
  | "insecure"
  /** The wasm runtime or the .task model failed to load. */
  | "model";

/** What `useHandTracking` hands back to the camera panel. */
export interface HandTracking {
  /** Attach to the <video> that shows the feed. */
  videoRef: RefObject<HTMLVideoElement | null>;
  /**
   * The most recent hand, or null when none is in frame.
   *
   * Deliberately a ref rather than state: landmarks arrive around 30 times a
   * second and re-rendering React that often to draw a canvas would be waste.
   * The overlay reads this from inside its own animation frame.
   */
  landmarksRef: RefObject<HandLandmarks | null>;
  phase: TrackingPhase;
  fault: TrackingFault | null;
  /** Detection rate over the last second. 0 when not tracking. */
  fps: number;
  /** Whether a hand is currently in frame. Updated on change, not per frame. */
  handPresent: boolean;
  /**
   * Which hand is in frame, or null when none is.
   *
   * Shown in the interface rather than kept internal, because it is the one
   * piece of tracking state a person can check against reality at a glance,
   * and the mirroring convention behind it is worth being able to catch.
   */
  handedness: Handedness | null;
  /** Try the camera again after a fault. */
  retry: () => void;
}
