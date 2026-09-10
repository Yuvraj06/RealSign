"use client";

import { CameraFeed } from "@/features/hand-tracking/components";
import type { HandTracking } from "@/features/hand-tracking/types";
import { Panel, StatusPill } from "@/shared/components";
import type { InterpreterStatus } from "@/shared/types";

interface CameraPanelProps {
  status: InterpreterStatus;
  tracking: HandTracking;
}

/** Left panel: the camera feed with the landmark skeleton over it. */
export function CameraPanel({ status, tracking }: CameraPanelProps) {
  const live = tracking.phase === "tracking";

  return (
    <Panel className="relative overflow-hidden p-3">
      <CameraFeed
        tracking={tracking}
        idleHint={
          // Only before the first start. Once it has run, the status pill
          // saying "paused" is the more useful thing to read.
          status === "idle" ? (
            <p className="measure font-body text-body text-forest">
              Show your hand to the camera, then hold one letter still at a
              time.
            </p>
          ) : undefined
        }
      >
        <StatusPill status={status} className="absolute left-4 top-4" />
      </CameraFeed>

      <div className="flex items-baseline justify-between gap-4 px-2 py-3">
        <p className="font-body text-caption text-forest/75">
          Video and landmarks stay on your device. Nothing is uploaded.
        </p>
        {live ? (
          <p className="shrink-0 font-body text-caption tabular-nums text-forest/75">
            {tracking.fps} fps
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
