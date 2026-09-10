import { cn } from "@/shared/lib";
import type { InterpreterStatus } from "@/shared/types";

const labels: Record<InterpreterStatus, string> = {
  idle: "idle",
  starting: "starting camera",
  reading: "reading",
  paused: "paused",
};

const tones: Record<InterpreterStatus, string> = {
  idle: "bg-white/90 text-forest/75",
  starting: "bg-white/90 text-forest",
  reading: "bg-green text-white",
  paused: "bg-sage text-forest",
};

export function StatusPill({
  status,
  className,
}: {
  status: InterpreterStatus;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1.5",
        "font-body text-caption font-semibold shadow-soft",
        tones[status],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          status === "reading"
            ? "animate-pulse bg-white"
            : status === "starting"
              ? "animate-pulse bg-green"
              : status === "paused"
                ? "bg-moss"
                : "bg-moss/60",
        )}
      />
      {labels[status]}
    </span>
  );
}
