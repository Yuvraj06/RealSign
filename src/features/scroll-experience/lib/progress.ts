"use client";

import { createContext, useContext, type RefObject } from "react";

/**
 * Scroll progress is shared as a ref, not as state.
 *
 * The pinned timeline updates it on every scroll frame. Anything that reads
 * it does so inside its own animation loop, so React never re-renders at
 * scroll rate.
 */
export const ScrollProgressContext = createContext<RefObject<number> | null>(
  null,
);

export function useScrollProgressRef(): RefObject<number> | null {
  return useContext(ScrollProgressContext);
}
