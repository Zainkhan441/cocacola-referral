import { type ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-surface-2 p-8 shadow-2xl shadow-black/40">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
        {description && <p className="text-sm text-white/60">{description}</p>}
      </div>
      {children}
    </div>
  );
}
