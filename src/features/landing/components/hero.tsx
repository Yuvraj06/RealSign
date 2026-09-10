"use client";

import { scrollToInterpreter } from "@/features/scroll-experience/lib";
import { Button } from "@/shared/components";

/**
 * Text left, hand right, both vertically centred, everything left aligned.
 * The hand is the only object allowed to be visually loud.
 */
export function Hero() {
  return (
    <div className="mx-auto flex size-full max-w-6xl items-center px-6 sm:px-10">
      <div className="w-full max-w-xl">
        <h1 className="font-display text-display font-semibold text-forest sm:text-hero">
          Hands to words.
        </h1>

        <p className="measure mt-6 font-body text-lead text-forest/80">
          Spell to the camera and realsign reads it back, one letter at a
          time, without sending anything anywhere.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Button onClick={scrollToInterpreter}>start signing</Button>
        </div>

        <p className="mt-8 font-body text-caption text-forest/75">
          24 letters of the manual alphabet, one hand. Video never leaves your
          device.
        </p>
      </div>
    </div>
  );
}
