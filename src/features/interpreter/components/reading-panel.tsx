"use client";

import { Panel } from "@/shared/components";
import type {
  InterpreterStatus,
  RecognizedToken,
  TranscriptEntry,
} from "@/shared/types";
import { ConfidenceMeter } from "./confidence-meter";
import { TokenChip } from "./token-chip";

interface ReadingPanelProps {
  status: InterpreterStatus;
  tokens: RecognizedToken[];
  confidence: number | null;
  sentence: string;
  transcript: TranscriptEntry[];
}

export function ReadingPanel({
  status,
  tokens,
  confidence,
  sentence,
  transcript,
}: ReadingPanelProps) {
  const active = status === "reading" || status === "sign";

  return (
    <Panel className="flex flex-col gap-8 p-7">
      <section aria-labelledby="tokens-heading">
        <h2 id="tokens-heading" className="font-body text-caption text-forest/75">
          letters and signs
        </h2>

        <div className="mt-3 flex min-h-[76px] flex-wrap items-center gap-2">
          {tokens.length > 0 ? (
            tokens.map((token) => <TokenChip key={token.id} token={token} />)
          ) : (
            <p className="measure font-body text-body text-forest/75">
              {active
                ? "Hold a letter until it lands, or sign a word in one movement."
                : "Start the camera, then sign a word or spell one letter at a time."}
            </p>
          )}
        </div>
      </section>

      <ConfidenceMeter value={confidence} />

      <section aria-labelledby="sentence-heading">
        <h2
          id="sentence-heading"
          className="font-body text-caption text-forest/75"
        >
          reading
        </h2>
        <p
          aria-live="polite"
          className="measure mt-2 font-display text-heading font-medium text-forest"
        >
          {sentence || (
            <span className="text-forest/75">Your words appear here.</span>
          )}
        </p>
        <p className="measure mt-2 font-body text-caption text-forest/75">
          Signs carry no tense or articles, so the smoothing step is what turns
          them into an English sentence.
        </p>
      </section>

      <section aria-labelledby="transcript-heading" className="flex flex-col">
        <h2
          id="transcript-heading"
          className="font-body text-caption text-forest/75"
        >
          transcript
        </h2>

        <ul className="mt-3 max-h-44 space-y-1.5 overflow-y-auto pr-1">
          {transcript.length > 0 ? (
            transcript.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-3 border-b border-sage pb-1.5 last:border-0"
              >
                <span className="font-body text-caption tracking-wide text-forest/75">
                  {entry.raw}
                </span>
                <span className="font-body text-body text-forest">
                  {entry.smoothed}
                </span>
              </li>
            ))
          ) : (
            <li className="font-body text-body text-forest/75">
              Finished phrases collect here, raw tokens beside the reading.
            </li>
          )}
        </ul>
      </section>
    </Panel>
  );
}
