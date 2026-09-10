import { CONFIDENCE_THRESHOLD } from "@/shared/config";
import { cn } from "@/shared/lib";

/**
 * How sure the model is about the letter it just read.
 *
 * The number is always shown, not just the bar, because colour alone must
 * not carry the warning.
 */
export function ConfidenceMeter({ value }: { value: number | null }) {
  const percent = value === null ? 0 : Math.round(value * 100);
  const unsure = value !== null && value < CONFIDENCE_THRESHOLD;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-body text-caption text-forest/75">confidence</span>
        <span
          className={cn(
            "font-display text-lead font-semibold tabular-nums",
            value === null ? "text-forest/75" : unsure ? "text-clay" : "text-forest",
          )}
        >
          {value === null ? "—" : `${percent}%`}
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Recognition confidence"
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sage"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-300",
            unsure ? "bg-clay" : "bg-green",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {unsure ? (
        <p className="mt-2 font-body text-caption text-clay">
          Low confidence. M, N, S and T look alike — check this letter.
        </p>
      ) : null}
    </div>
  );
}
