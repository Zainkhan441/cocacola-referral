import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-white/15 bg-surface-3 px-4 text-sm text-white placeholder:text-white/30 transition-colors focus:border-brand focus:outline-none",
        className,
      )}
      {...props}
    />
  );
});
