"use client";

import { HERO_SCROLL_LENGTH, HERO_STAGE_ID } from "@/shared/config";
import { getLenis } from "../hooks/use-smooth-scroll";

/**
 * Jump to the end of the reveal, where the interpreter is fully in place.
 *
 * With the pin active the interpreter has no scroll position of its own, so
 * the target is the bottom of the pinned range. Without the pin the stage is
 * a normal section and the interpreter sits one viewport down.
 */
export function scrollToInterpreter() {
  const stage = document.getElementById(HERO_STAGE_ID);
  if (!stage) return;

  const lenis = getLenis();
  const top =
    stage.offsetTop +
    (lenis ? window.innerHeight * HERO_SCROLL_LENGTH : window.innerHeight);

  if (lenis) {
    lenis.scrollTo(top, { duration: 1.4 });
    return;
  }

  window.scrollTo({ top, behavior: "auto" });
}
