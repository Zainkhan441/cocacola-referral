import { type ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertVariant = "error" | "success" | "info";

const VARIANT_STYLES: Record<AlertVariant, string> = {
  error: "border-red-500/30 bg-red-500/10 text-red-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  info: "border-white/15 bg-white/5 text-white/70",
};

const VARIANT_ICON: Record<AlertVariant, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: AlertCircle,
};

type AlertProps = {
  variant?: AlertVariant;
  children: ReactNode;
  className?: string;
};

export function Alert({ variant = "info", children, className }: AlertProps) {
  const Icon = VARIANT_ICON[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
        VARIANT_STYLES[variant],
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
