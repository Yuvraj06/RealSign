"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components";
import { useInterpreter } from "../hooks";
import { CameraPanel } from "./camera-panel";
import { ReadingPanel } from "./reading-panel";

export function Interpreter() {
  const {
    status,
    tokens,
    confidence,
    sentence,
    transcript,
    modelFault,
    tracking,
    start,
    pause,
    clear,
  } = useInterpreter();

  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const copyTranscript = useCallback(async () => {
    const text = transcript.map((entry) => entry.smoothed).join(" ");
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard access can be refused. Saying nothing is better than an
      // alert, and the transcript is still on screen to select by hand.
      return;
    }

    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 1800);
  }, [transcript]);

  const reading = status === "reading";
  const starting = status === "starting";

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:px-10">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-title font-semibold text-forest">
            interpreter
          </h1>
          <p className="measure mt-1 font-body text-body text-forest/75">
            Fingerspelling, one hand, one signer. The camera and the model both
            run in this browser.
          </p>
        </div>

        {/* Verbs stay consistent: "start camera" produces "reading". */}
        <div className="flex flex-wrap items-center gap-3">
          {reading ? (
            <Button variant="secondary" onClick={pause}>
              pause
            </Button>
          ) : (
            <Button onClick={start} disabled={starting}>
              {starting ? (
                <>
                  <span
                    aria-hidden
                    className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  />
                  starting camera
                </>
              ) : status === "paused" ? (
                "resume camera"
              ) : (
                "start camera"
              )}
            </Button>
          )}
          <Button variant="secondary" onClick={clear}>
            clear
          </Button>
          <Button
            variant="quiet"
            onClick={copyTranscript}
            disabled={transcript.length === 0}
          >
            {copied ? "copied" : "copy transcript"}
          </Button>
        </div>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <CameraPanel status={status} tracking={tracking} />
        <ReadingPanel
          status={status}
          tokens={tokens}
          confidence={confidence}
          sentence={sentence}
          transcript={transcript}
          modelFault={modelFault}
        />
      </div>

      <p className="measure mt-6 font-body text-caption text-forest/75">
        Trained on 1,440 samples from one sitting, one hand, one camera. The
        99.7% it scores on held-out frames from that sitting is an upper bound,
        not a promise.
      </p>
    </div>
  );
}
