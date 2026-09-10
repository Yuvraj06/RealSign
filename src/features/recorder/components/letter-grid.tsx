"use client";

import { cn } from "@/shared/lib";
import { ALPHABET, SAMPLES_MIN, SAMPLES_TARGET } from "../lib";

interface LetterGridProps {
  selected: string;
  counts: Record<string, number>;
  onSelect: (letter: string) => void;
  /** Locked while a burst is running, so samples cannot change label midway. */
  disabled?: boolean;
}

/**
 * The whole alphabet at once, with how far along each letter is.
 *
 * Seeing all 26 is the point: the useful question during a recording session
 * is never "how many of A do I have" but "what have I been avoiding".
 */
export function LetterGrid({
  selected,
  counts,
  onSelect,
  disabled = false,
}: LetterGridProps) {
  return (
    <ul className="grid grid-cols-6 gap-2 sm:grid-cols-9 lg:grid-cols-13">
      {ALPHABET.map(({ letter, motion }) => {
        const count = counts[letter] ?? 0;
        const done = count >= SAMPLES_MIN;
        const active = letter === selected;

        return (
          <li key={letter}>
            <button
              type="button"
              onClick={() => onSelect(letter)}
              aria-pressed={active}
              aria-label={`${letter}, ${count} samples`}
              disabled={disabled && !active}
              className={cn(
                "relative w-full overflow-hidden rounded-chip px-2 pb-3 pt-2.5",
                "border transition-colors duration-200",
                "disabled:cursor-not-allowed disabled:opacity-50",
                active
                  ? "border-green bg-green text-white"
                  : done
                    ? "border-sage bg-sage text-forest enabled:hover:border-green"
                    : "border-sage bg-white text-forest enabled:hover:border-green",
              )}
            >
              <span className="block font-display text-lead font-semibold">
                {letter}
                {motion ? (
                  <span
                    aria-hidden
                    className={cn(
                      "ml-0.5 align-super font-body text-caption",
                      active ? "text-white/70" : "text-moss",
                    )}
                  >
                    *
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "block font-body text-caption tabular-nums",
                  active ? "text-white/80" : "text-forest/75",
                )}
              >
                {count}
              </span>

              {/* Progress toward a trainable letter, drawn as the cell's floor. */}
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 bottom-0 h-1",
                  active ? "bg-white/25" : "bg-sage",
                )}
              >
                <span
                  className={cn(
                    "block h-full transition-[width] duration-300",
                    active ? "bg-white" : "bg-green",
                  )}
                  style={{
                    width: `${Math.min(100, (count / SAMPLES_TARGET) * 100)}%`,
                  }}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
