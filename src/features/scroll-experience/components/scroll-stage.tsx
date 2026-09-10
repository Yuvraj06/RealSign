"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HERO_SCROLL_LENGTH, HERO_STAGE_ID } from "@/shared/config";
import { useReducedMotion } from "@/shared/hooks";
import { useSmoothScroll } from "../hooks/use-smooth-scroll";
import { ScrollProgressContext } from "../lib/progress";

interface ScrollStageProps {
  /** Hero copy. Fades out and lifts as the hand crosses. */
  hero: ReactNode;
  /** The 3D hand layer. Keeps moving after the copy is gone. */
  backdrop: ReactNode;
  /** The interpreter, revealed underneath. */
  interpreter: ReactNode;
}

/**
 * The reveal.
 *
 * Markup is two stacked full-height sections, which is what the server
 * renders and what reduced-motion users keep. When motion is allowed, the
 * effect below lifts both into absolute layers, pins the wrapper, and scrubs
 * one timeline across two viewport heights of scrolling.
 *
 * The interpreter starts arriving while the hand is still crossing, so the
 * hand reads as doing the revealing rather than simply leaving.
 */
export function ScrollStage({
  hero,
  backdrop,
  interpreter,
}: ScrollStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const heroCopyRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);

  const reducedMotion = useReducedMotion();
  const animate = reducedMotion === false;

  useSmoothScroll(animate);

  useEffect(() => {
    if (!animate) return;

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      // Lift the flow layout into layers. Doing this here rather than in the
      // markup keeps the server render and the no-JS render usable.
      gsap.set(stageRef.current, { height: "100svh", overflow: "hidden" });
      gsap.set([heroRef.current, panelRef.current], {
        position: "absolute",
        inset: 0,
      });
      gsap.set(panelRef.current, {
        opacity: 0,
        scale: 0.9,
        y: 90,
        pointerEvents: "none",
      });

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stageRef.current,
          start: "top top",
          end: `+=${HERO_SCROLL_LENGTH * 100}%`,
          pin: true,
          scrub: 1,
          onUpdate: (self) => {
            progressRef.current = self.progress;
          },
        },
      });

      timeline
        .to(heroCopyRef.current, { opacity: 0, y: -40, duration: 0.42 }, 0)
        .set(heroCopyRef.current, { pointerEvents: "none" }, 0.42)
        // The panel rises while the hand is still crossing above it, so the
        // hand reads as uncovering the tool rather than simply leaving.
        .fromTo(
          panelRef.current,
          { opacity: 0, scale: 0.9, y: 90 },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.55,
            ease: "power2.out",
          },
          0.3,
        )
        // The hand thins out early, while it is still crossing the middle of
        // the frame. Starting this later hides the fade, because the sweep
        // has already carried the hand past the left edge by then.
        .to(handRef.current, { opacity: 0, duration: 0.40 }, 0.22)
        .set(panelRef.current, { pointerEvents: "auto" }, 0.85)
        // Hold to the end so timeline progress maps 1:1 onto scroll progress.
        .to({}, { duration: 0.15 }, 0.85);
    }, stageRef);

    return () => context.revert();
  }, [animate]);

  return (
    <ScrollProgressContext value={progressRef}>
      <div id={HERO_STAGE_ID} ref={stageRef} className="relative bg-cream">
        <div ref={heroRef} className="relative z-10 h-svh overflow-hidden">
          {/* heroCopyRef wraps only the text, so the hand keeps moving
              after the copy has faded out. */}
          <div ref={heroCopyRef} className="relative z-10 size-full">
            {hero}
          </div>
        </div>

        {/* The hand sits above the hero copy but below the interpreter, so it
            passes behind the panels and stays visible in the gaps between
            them. One viewport tall and pinned to the top of the stage, which
            keeps it over the hero in the reduced-motion layout too. */}
        <div
          ref={handRef}
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-svh"
        >
          {backdrop}
        </div>

        {/* Transparent, so only the boxes themselves occlude the hand. */}
        <div ref={panelRef} className="relative z-30 flex min-h-svh">
          {interpreter}
        </div>
      </div>
    </ScrollProgressContext>
  );
}
