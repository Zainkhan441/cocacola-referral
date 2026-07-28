"use client";

import { AlertTriangle, CheckCircle2, Info, Trash2, XCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button, type ButtonVariant } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmVariant = "delete" | "warning" | "success" | "error" | "information";

export type ConfirmOptions = {
  title: string;
  message: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  // Passive dismissal (ESC / backdrop click) — defaults to true. A
  // caller confirming something unusually consequential can set this to
  // false so the only way out is an explicit Cancel/Confirm choice.
  closeOnBackdropClick?: boolean;
};

const VARIANT_CONFIG: Record<
  ConfirmVariant,
  { icon: typeof Trash2; iconClassName: string; confirmVariant: ButtonVariant; defaultConfirmLabel: string }
> = {
  delete: {
    icon: Trash2,
    iconClassName: "border-red-500/30 bg-red-500/10 text-red-400",
    confirmVariant: "destructive",
    defaultConfirmLabel: "Delete",
  },
  warning: {
    icon: AlertTriangle,
    iconClassName: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    confirmVariant: "warning",
    defaultConfirmLabel: "Continue",
  },
  success: {
    icon: CheckCircle2,
    iconClassName: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    confirmVariant: "primary",
    defaultConfirmLabel: "OK",
  },
  error: {
    icon: XCircle,
    iconClassName: "border-red-500/30 bg-red-500/10 text-red-400",
    confirmVariant: "primary",
    defaultConfirmLabel: "OK",
  },
  information: {
    icon: Info,
    iconClassName: "border-sky-500/30 bg-sky-500/10 text-sky-300",
    confirmVariant: "primary",
    defaultConfirmLabel: "OK",
  },
};

type ConfirmDialogProps = ConfirmOptions & {
  onCancel: () => void;
  onConfirm: () => void;
};

// The professional, reusable replacement for window.confirm() — see
// ConfirmProvider/useConfirm for the promise-based call site this backs.
// Built on the shared Modal primitive, so it inherits backdrop blur,
// enter/exit animation, ESC-to-close, focus trap, and restore-focus for
// free; only the variant-specific icon/color/button and the two actions
// are unique to this component.
export function ConfirmDialog({
  title,
  message,
  variant = "information",
  confirmLabel,
  cancelLabel = "Cancel",
  closeOnBackdropClick = true,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  return (
    <Modal onClose={onCancel} title={title} closeOnBackdropClick={closeOnBackdropClick}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border",
              config.iconClassName,
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="pt-2 text-sm text-white/70">{message}</p>
        </div>

        <div className="flex gap-3">
          <Button variant={config.confirmVariant} size="md" onClick={onConfirm} autoFocus>
            {confirmLabel ?? config.defaultConfirmLabel}
          </Button>
          <Button variant="outline" size="md" onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
