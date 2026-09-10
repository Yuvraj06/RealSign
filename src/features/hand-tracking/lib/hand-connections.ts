import type { HandLandmarks } from "../types";

/**
 * MediaPipe's canonical bone list: pairs of landmark indices to draw a line
 * between. Same list the real overlay uses in Phase 2.
 */
export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  // thumb
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  // index
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  // middle
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  // ring
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  // pinky
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
];

/**
 * A roughly open right hand, palm to camera, in normalized coordinates.
 * Stands in for a real detection until MediaPipe is wired up.
 */
export const PLACEHOLDER_HAND: HandLandmarks = [
  { x: 0.5, y: 0.92 }, // 0 wrist
  { x: 0.36, y: 0.84 }, // 1 thumb cmc
  { x: 0.28, y: 0.74 }, // 2
  { x: 0.24, y: 0.65 }, // 3
  { x: 0.21, y: 0.57 }, // 4 thumb tip
  { x: 0.4, y: 0.58 }, // 5 index mcp
  { x: 0.38, y: 0.45 }, // 6
  { x: 0.37, y: 0.36 }, // 7
  { x: 0.36, y: 0.28 }, // 8 index tip
  { x: 0.5, y: 0.56 }, // 9 middle mcp
  { x: 0.5, y: 0.42 }, // 10
  { x: 0.5, y: 0.32 }, // 11
  { x: 0.5, y: 0.24 }, // 12 middle tip
  { x: 0.6, y: 0.58 }, // 13 ring mcp
  { x: 0.61, y: 0.45 }, // 14
  { x: 0.62, y: 0.35 }, // 15
  { x: 0.63, y: 0.28 }, // 16 ring tip
  { x: 0.69, y: 0.62 }, // 17 pinky mcp
  { x: 0.72, y: 0.51 }, // 18
  { x: 0.74, y: 0.43 }, // 19
  { x: 0.76, y: 0.37 }, // 20 pinky tip
];
