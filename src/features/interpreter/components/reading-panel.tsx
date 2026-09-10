"use client";

import type { RecognizerFault } from "@/features/sign-classifier/types";
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
  modelFault: RecognizerFault | null;
}

export function ReadingPanel({
  status,
  tokens,
  confidence,
  sentence,
  transcript,
  modelFault,
}: ReadingPanelProps) {
  const active = status === "reading";

  return (
    <Panel className="flex flex-col gap-8 p-7">
      <section aria-labelledby="tokens-heading">
        <h2 id="tokens-heading" className="font-body text-caption text-forest/75">
          letters
        </h2>

        <div className="mt-3 flex min-h-[76px] flex-wrap items-center gap-2">
          {tokens.length > 0 ? (
            tokens.map((token) => <TokenChip key={token.id} token={token} />)
          ) : (
            <p className="measure font-body text-body text-forest/75">
              {modelFault
                ? "The letter model could not be loaded, so nothing can be read. Check your connection and start the camera again."
                : active
                  ? "Hold each letter still until it lands. Dip your hand briefly between a double letter, and pause longer to finish the word."
                  : "Start the camera, then spell a word one letter at a time."}
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
          Exactly the letters that were read, in order. Nothing corrects them
          into a word that looks more likely, so a misread letter stays visible
          instead of being tidied away.
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
              Finished words collect here, letter by letter beside the reading.
            </li>
          )}
        </ul>
      </section>
    </Panel>
  );
}
