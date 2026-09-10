"use client";

import { CameraFeed } from "@/features/hand-tracking/components";
import type { HandTracking } from "@/features/hand-tracking/types";
import { Button, Panel } from "@/shared/components";
import { cn } from "@/shared/lib";
import type { CapturePhase } from "../types";

interface CapturePanelProps {
  tracking: HandTracking;
  letter: string;
  phase: CapturePhase;
  countdown: number;
  captured: number;
  rejected: number;
  onStartCamera: () => void;
}

/** The feed, with the letter being recorded and what the capture is doing. */
export function CapturePanel({
  tracking,
  letter,
  phase,
  countdown,
  captured,
  rejected,
  onStartCamera,
}: CapturePanelProps) {
  const live = tracking.phase === "tracking";

  return (
    <Panel className="overflow-hidden p-3">
      <CameraFeed
        tracking={tracking}
        idleHint={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="measure font-body text-body text-forest">
              Recording writes to this browser only. Export before you clear it.
            </p>
            <Button onClick={onStartCamera}>start camera</Button>
          </div>
        }
      >
        {/* The letter to make, kept out of the mirrored layer so it reads. */}
        <span className="absolute right-4 top-4 inline-flex size-14 items-center justify-center rounded-chip bg-white/92 font-display text-heading font-semibold text-forest shadow-soft">
          {letter}
        </span>

        {phase !== "idle" ? (
          <span
            className={cn(
              "absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5",
              "font-body text-caption font-semibold shadow-soft",
              phase === "recording"
                ? "bg-green text-white"
                : "bg-white/92 text-forest",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "size-2 rounded-full",
                phase === "recording" ? "animate-pulse bg-white" : "bg-green",
              )}
            />
            {phase === "recording" ? "recording" : "get ready"}
          </span>
        ) : null}

        {phase === "counting" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="font-display text-hero font-semibold tabular-nums text-white drop-shadow-[0_4px_16px_rgba(34,64,47,0.45)]">
              {countdown}
            </span>
          </div>
        ) : null}
      </CameraFeed>

      <div className="flex items-baseline justify-between gap-4 px-2 py-3">
        <p className="font-body text-caption text-forest/75">
          {phase === "recording"
            ? "Move your hand a little: closer, further, tilted. Variety is what the model learns from."
            : "Video stays on your device. Only the landmark numbers are kept."}
        </p>
        {live ? (
          <p className="shrink-0 font-body text-caption tabular-nums text-forest/75">
            {rejected > 0 ? `${rejected} skipped · ` : ""}
            {tracking.fps} fps
          </p>
        ) : null}
      </div>

      {/* Named out loud so a wrong mirroring convention is caught in a glance
          rather than in a confusion matrix three phases later. */}
      {live && tracking.handedness ? (
        <p className="px-2 pb-2 font-body text-caption text-forest/75">
          Reading your {tracking.handedness} hand. Either hand works: left ones
          are reflected into the same space before they are stored.
        </p>
      ) : null}

      {phase === "recording" ? (
        <p className="sr-only" aria-live="polite">
          {captured} samples captured
        </p>
      ) : null}
    </Panel>
  );
}
