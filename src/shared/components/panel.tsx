import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib";

/** A white surface with a hairline sage border and a warm, soft shadow. */
export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-panel border border-sage bg-white shadow-soft",
        className,
      )}
      {...props}
    />
  );
}
