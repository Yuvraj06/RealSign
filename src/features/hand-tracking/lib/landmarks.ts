import type { HandLandmarks, Handedness } from "../types";

/**
 * Spatial normalization. The step most projects get wrong.
 *
 * Raw MediaPipe coordinates are relative to the video frame, so the same
 * letter signed at a different distance, or in a different corner, produces
 * completely different numbers. A classifier trained on those numbers learns
 * where you stood rather than what you signed.
 *
 * This exact function has to run during recording and during inference. Any
 * difference between the two quietly destroys accuracy and is very hard to
 * debug afterwards, which is why it lives here rather than in either caller.
 */

/** MediaPipe's canonical order puts the wrist first. */
const WRIST = 0;

/** Base of the middle finger. The most stable point to measure hand size by. */
const MIDDLE_MCP = 9;

export const LANDMARK_COUNT = 21;

/** 21 points of x, y, z. The input width of the letter model. */
export const FEATURE_LENGTH = LANDMARK_COUNT * 3;

/** Below this the hand is a degenerate blob and dividing by it is meaningless. */
const MIN_SCALE = 1e-6;

/**
 * Where the tilt-removed hand points: straight up the frame. Screen y grows
 * downward, so "up" is negative y, which is -π/2.
 */
const CANONICAL_ANGLE = -Math.PI / 2;

export interface NormalizedHand {
  /**
   * 63 values, wrist at the origin, wrist-to-middle-MCP scaled to 1, tilt
   * removed. Ready to feed to the letter model.
   */
  values: number[];
  /**
   * Where the hand sat in the frame, 0 to 1, before it was moved to the
   * origin. Meaningless for letters. Word signs need it, because some of them
   * mean different things at different heights, so it is kept as an extra
   * channel rather than thrown away.
   */
  wrist: { x: number; y: number };
  /**
   * The tilt that was removed, in radians. Kept for the same reason as
   * `wrist`: the letter model needs it gone, the sign model needs it.
   */
  rotation: number;
}

/**
 * Reflects a hand horizontally, turning a left hand into the right hand that
 * would make the same letter.
 *
 * A left-handed A is not a variation on a right-handed A, it is its mirror
 * image, and in landmark space the two are as different as A is from B. Left
 * as-is, the model has to learn all 26 letters twice from half as much data
 * each, and a signer whose handedness is under-represented gets a worse tool.
 *
 * Reflecting instead means one canonical space, one set of classes, and both
 * hands working from the same samples. Which hand you record with stops
 * mattering, which is the point.
 */
export function mirrorHand(hand: HandLandmarks): HandLandmarks {
  // Reflecting about the middle of the frame rather than negating keeps the
  // wrist position meaningful, which the sign model needs later.
  return hand.map((point) => ({ ...point, x: 1 - point.x }));
}

/**
 * Translate to the wrist, scale to hand size, rotate the tilt out, flatten.
 *
 * A left hand is reflected first, so what comes out is always in right-hand
 * space no matter which hand went in. Pass the handedness MediaPipe reported;
 * getting it wrong is silent and produces a mirrored sample, which is why the
 * recorder shows the detected hand on screen.
 *
 * Returns null for a hand too small or too collapsed to measure, which happens
 * on the frames where MediaPipe is losing tracking.
 */
export function normalizeHand(
  landmarks: HandLandmarks,
  handedness: Handedness = "right",
): NormalizedHand | null {
  if (landmarks.length !== LANDMARK_COUNT) return null;

  const hand = handedness === "left" ? mirrorHand(landmarks) : landmarks;

  const wrist = hand[WRIST];
  const middle = hand[MIDDLE_MCP];

  // 1. Translate so the wrist sits at the origin.
  const dx = middle.x - wrist.x;
  const dy = middle.y - wrist.y;

  // 2. Scale so wrist-to-middle-MCP is 1. Measured in the image plane only:
  //    MediaPipe's z is far noisier than x and y, and letting it into the
  //    divisor makes the whole vector jump when depth guessing wobbles.
  const scale = Math.hypot(dx, dy);
  if (scale < MIN_SCALE) return null;

  // 3. Rotate so that vector always points the same way, which removes how
  //    far the hand is tilted. Letters are handshapes, not orientations.
  const rotation = Math.atan2(dy, dx);
  const turn = CANONICAL_ANGLE - rotation;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);

  // 4. Flatten the 21 points into a 63-value vector.
  const values = new Array<number>(FEATURE_LENGTH);

  for (let index = 0; index < LANDMARK_COUNT; index += 1) {
    const point = hand[index];
    const x = (point.x - wrist.x) / scale;
    const y = (point.y - wrist.y) / scale;

    const slot = index * 3;
    values[slot] = x * cos - y * sin;
    values[slot + 1] = x * sin + y * cos;
    // Depth rotates with nothing: the turn happens in the image plane.
    values[slot + 2] = ((point.z ?? 0) - (wrist.z ?? 0)) / scale;
  }

  return { values, wrist: { x: wrist.x, y: wrist.y }, rotation };
}

/**
 * Whether every landmark sits inside the frame.
 *
 * MediaPipe happily extrapolates points past the edge of the picture, and a
 * hand with two fingers guessed off-screen is a bad training sample. Rejecting
 * these at record time is much cheaper than finding them in a confusion matrix
 * later.
 */
export function isFullyVisible(hand: HandLandmarks, margin = 0.02) {
  return hand.every(
    (point) =>
      point.x >= margin &&
      point.x <= 1 - margin &&
      point.y >= margin &&
      point.y <= 1 - margin,
  );
}
