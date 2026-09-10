// App-wide constants.

/** 3D hand shown in the hero. */
export const MODEL_PATH = "/models/hand.glb";

/**
 * MediaPipe runtime, served from this origin rather than a CDN.
 * Both paths are filled in by `npm run setup:vision`.
 */
export const VISION_WASM_PATH = "/mediapipe/wasm";
export const HAND_LANDMARKER_PATH = "/models/hand_landmarker.task";

/**
 * Below this the reading is shown in clay instead of green.
 * M, N, S and T are genuinely similar in ASL, so surfacing doubt
 * beats a confident wrong answer.
 */
export const CONFIDENCE_THRESHOLD = 0.72;

/** Scroll distance the pinned hero consumes, as a fraction of viewport height. */
export const HERO_SCROLL_LENGTH = 2;

/** Anchor id for the pinned hero wrapper. */
export const HERO_STAGE_ID = "hero-stage";
