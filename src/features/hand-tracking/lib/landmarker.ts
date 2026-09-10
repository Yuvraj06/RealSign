import { HAND_LANDMARKER_PATH, VISION_WASM_PATH } from "@/shared/config";
import type { Category, HandLandmarker } from "@mediapipe/tasks-vision";
import type { Handedness } from "../types";

/**
 * Loads the MediaPipe hand landmarker.
 *
 * The package is imported dynamically because it pulls in the whole vision
 * bundle, and the landing page must not pay for it before anyone presses
 * "start camera".
 *
 * One instance is enough for the life of the page, so the promise is cached:
 * pausing and resuming must not re-download 19MB of wasm and model.
 */
let pending: Promise<HandLandmarker> | null = null;

export function loadHandLandmarker() {
  pending ??= create();
  return pending;
}

async function create(): Promise<HandLandmarker> {
  const { FilesetResolver, HandLandmarker } = await import(
    "@mediapipe/tasks-vision"
  );

  const vision = await FilesetResolver.forVisionTasks(VISION_WASM_PATH);

  const options = {
    baseOptions: { modelAssetPath: HAND_LANDMARKER_PATH },
    runningMode: "VIDEO" as const,
    // One signer, one hand. Section 8: two-handed signs are out of scope,
    // and looking for a second hand costs frame rate for nothing.
    numHands: 1,
    // Detection is deliberately stricter than tracking. A false hand in the
    // frame is worse than a moment of nothing, but once a real hand is locked
    // on, a loose grip keeps it through blur and fast movement.
    minHandDetectionConfidence: 0.6,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };

  try {
    return await HandLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: "GPU" },
    });
  } catch {
    // Some machines have no usable WebGL context. CPU is slower but correct,
    // and a slow feed beats a broken one.
    return await HandLandmarker.createFromOptions(vision, {
      ...options,
      baseOptions: { ...options.baseOptions, delegate: "CPU" },
    });
  }
}

/**
 * Whether the picture handed to MediaPipe is already selfie-flipped.
 *
 * It is not: the feed is mirrored in CSS for the viewer, while
 * `detectForVideo` reads the raw frames underneath. MediaPipe decides
 * handedness as though it were looking at a mirrored image, so with a raw
 * frame its label arrives backwards and gets swapped below.
 *
 * If the recorder ever labels your right hand as "left", this constant is the
 * one thing to flip.
 */
const INPUT_IS_MIRRORED = false;

/** Reads which hand MediaPipe saw, correcting for the mirroring convention. */
export function readHandedness(
  categories: Category[] | undefined,
): Handedness | null {
  const name = categories?.[0]?.categoryName?.toLowerCase();
  if (name !== "left" && name !== "right") return null;

  if (INPUT_IS_MIRRORED) return name;
  return name === "left" ? "right" : "left";
}

/**
 * Drops the cached instance. Only for a full teardown; a paused camera keeps
 * its landmarker so resuming is instant.
 */
export async function closeHandLandmarker() {
  const instance = pending;
  pending = null;
  if (!instance) return;

  try {
    (await instance).close();
  } catch {
    // Already gone. Nothing to release.
  }
}
