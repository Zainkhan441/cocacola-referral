import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const VARIANT_STYLES = {
  primary: "bg-brand text-white hover:bg-brand-dark shadow-lg shadow-brand/20",
  secondary: "bg-white text-black hover:bg-zinc-200",
  outline:
    "border border-white/15 text-white hover:border-white/40 hover:bg-white/5",
  ghost: "text-white/80 hover:text-white hover:bg-white/5",
  warning:
    "border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
  destructive: "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20",
} as const;

const SIZE_STYLES = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
} as const;

export type ButtonVariant = keyof typeof VARIANT_STYLES;
export type ButtonSize = keyof typeof SIZE_STYLES;

type ButtonVariantsOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: ButtonVariantsOptions = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
    VARIANT_STYLES[variant],
    SIZE_STYLES[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
}
