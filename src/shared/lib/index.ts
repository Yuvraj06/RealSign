/** Join class names, dropping falsy values. */
export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

/** Linear interpolation. */
export function lerp(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

/** Clamp a number into a range. */
export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
