"use client";

import type { ReactNode } from "react";
import { Button } from "@/shared/components";
import { cn } from "@/shared/lib";
import type { HandTracking, TrackingFault } from "../types";
import { LandmarkOverlay } from "./landmark-overlay";

/**
 * What went wrong, and what the person can do about it.
 *
 * Each fault gets its own way forward rather than one shared apology, because
 * a blocked permission and a missing camera are not the same problem. `retry`
 * is omitted where trying again cannot help.
 */
const FAULTS: Record<TrackingFault, { message: string; retry: boolean }> = {
  denied: {
    message:
      "The camera is blocked. Allow camera access for this site in your browser's address bar, then try again.",
    retry: true,
  },
  unavailable: {
    message:
      "No camera is available. Another app may be using it, or this device may not have one.",
    retry: true,
  },
  insecure: {
    message:
      "The camera needs a secure connection. Open realsign over https, or on localhost.",
    retry: false,
  },
  model: {
    message:
      "The hand tracker could not load. Check your connection and try again.",
    retry: true,
  },
};

interface CameraFeedProps {
  tracking: HandTracking;
  /** Shown over the feed before the camera has been started. */
  idleHint?: ReactNode;
  /** Chrome drawn over the feed, unmirrored. Status pills, counters, labels. */
  children?: ReactNode;
  className?: string;
}

/**
 * The mirrored video with the landmark skeleton over it, and every reason it
 * might not be showing one.
 *
 * Mirrored so that moving your hand right moves it right on screen. The
 * skeleton is mirrored with it, which is why both sit inside the same flipped
 * wrapper and every piece of text sits outside it.
 */
export function CameraFeed({
  tracking,
  idleHint,
  children,
  className,
}: CameraFeedProps) {
  const { videoRef, landmarksRef, phase, fault, handPresent } = tracking;

  const live = phase === "tracking";
  const faulted = phase === "faulted" && fault !== null;
  const explanation = fault ? FAULTS[fault] : null;

  return (
    <div
      className={cn(
        "relative aspect-4/3 w-full overflow-hidden rounded-chip bg-sage",
        className,
      )}
    >
      <div className="absolute inset-0 -scale-x-100">
        <video
          ref={videoRef}
          muted
          playsInline
          // Rendered even before the stream arrives so the ref exists when the
          // camera opens, and hidden until there is something to show.
          className={cn(
            "absolute inset-0 size-full object-cover transition-opacity duration-500",
            live ? "opacity-100" : "opacity-0",
          )}
        />
        <LandmarkOverlay
          videoRef={videoRef}
          landmarksRef={landmarksRef}
          active={live}
          // The illustrative hand fills the panel only when there is no feed to
          // draw over, so it is never mistaken for a real detection.
          placeholder={!live && !faulted}
        />
      </div>

      {children}

      {phase === "starting" ? (
        <FeedMessage>
          <Spinner />
          Starting the camera. The hand tracker downloads once, then stays
          cached.
        </FeedMessage>
      ) : null}

      {faulted && explanation ? (
        <FeedMessage>
          <span className="measure">{explanation.message}</span>
          {explanation.retry ? (
            <Button variant="secondary" onClick={tracking.retry}>
              try again
            </Button>
          ) : null}
        </FeedMessage>
      ) : null}

      {live && !handPresent ? (
        <FeedMessage>Hold your hand up to the camera.</FeedMessage>
      ) : null}

      {phase === "off" && !faulted && idleHint ? (
        <div className="absolute inset-x-0 bottom-0 p-5">{idleHint}</div>
      ) : null}
    </div>
  );
}

/** A line of text over the feed, centred at the bottom where it blocks least. */
export function FeedMessage({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-center p-5">
      <p className="inline-flex flex-wrap items-center justify-center gap-3 rounded-chip bg-white/92 px-4 py-3 text-center font-body text-caption text-forest shadow-soft">
        {children}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-sage border-t-green"
    />
  );
}
