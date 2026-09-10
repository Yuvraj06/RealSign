"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

let instance: Lenis | null = null;

/** The live Lenis instance, or null when smooth scrolling is off. */
export function getLenis() {
  return instance;
}

/**
 * Drives Lenis from GSAP's ticker and feeds every scroll into ScrollTrigger.
 * Running both off one clock is what keeps pinning and scrubbing in sync.
 *
 * Pass `enabled: false` for reduced motion — the page then uses native
 * scrolling and no timeline is created.
 */
export function useSmoothScroll(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    instance = lenis;

    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      instance = null;
    };
  }, [enabled]);
}
