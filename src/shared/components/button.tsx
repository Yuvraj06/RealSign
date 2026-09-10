import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib";

type Variant = "primary" | "secondary" | "quiet";

const variants: Record<Variant, string> = {
  primary:
    "bg-green text-white shadow-soft hover:bg-forest disabled:bg-moss disabled:shadow-none",
  secondary:
    "bg-white text-forest border border-sage hover:border-green hover:text-green",
  quiet: "bg-sage text-forest hover:bg-green hover:text-white",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3",
        "font-body text-body font-semibold",
        "transition-colors duration-200",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
