import { signLabel } from "@/features/sign-classifier/lib";
import { CONFIDENCE_THRESHOLD } from "@/shared/config";
import { cn } from "@/shared/lib";
import type { RecognizedToken } from "@/shared/types";

/**
 * One thing the recognizer read.
 *
 * Letters and signs sit in the same face at the same size, so a phrase built
 * from both reads as one line. The `sign` label marks which is which, because
 * a user correcting a mistake needs to know whether the model read a gesture
 * or spelled something out.
 *
 * Clay means the model is unsure. The percentage is spelled out beside the
 * value so the warning never depends on colour alone.
 */
export function TokenChip({ token }: { token: RecognizedToken }) {
  const unsure = token.confidence < CONFIDENCE_THRESHOLD;
  const percent = Math.round(token.confidence * 100);
  const isSign = token.kind === "sign";

  return (
    <span
      className={cn(
        "inline-flex flex-col items-center gap-0.5 rounded-chip py-2.5",
        "font-display text-title font-semibold",
        isSign ? "px-5" : "px-4 tabular-nums",
        unsure
          ? "bg-clay/12 text-clay ring-1 ring-clay/40"
          : "bg-sage text-forest",
      )}
    >
      {isSign ? signLabel(token.value) : token.value}
      <span className="font-body text-caption font-normal tabular-nums">
        {isSign ? "sign · " : ""}
        {percent}%{unsure ? " · unsure" : ""}
      </span>
    </span>
  );
}
