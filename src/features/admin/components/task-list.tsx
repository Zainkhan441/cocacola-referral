"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/format";
import { useAuth } from "@/features/auth/context/auth-provider";
import { setTaskStatusAction } from "@/features/admin/lib/task-actions";
import type { TaskDoc, TaskStatus } from "@/lib/firestore/tasks";

type TaskListProps = {
  tasks: TaskDoc[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  onEdit: (task: TaskDoc) => void;
};

const STATUS_STYLES: Record<TaskStatus, string> = {
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  disabled: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  archived: "border-white/15 bg-white/5 text-white/50",
};

export function TaskList({ tasks, loading, error, retry, onEdit }: TaskListProps) {
  const { user } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  async function handleSetStatus(task: TaskDoc, status: TaskStatus) {
    if (!user || busyId) return;
    setRowError(null);
    setBusyId(task.id);
    try {
      await setTaskStatusAction(task.id, task.title, status, {
        adminUid: user.uid,
        adminName: user.displayName ?? user.email ?? "Admin",
      });
    } catch {
      setRowError("Couldn’t update that task. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
        <Alert variant="error">{error}</Alert>
        <Button variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
        <ClipboardList className="h-6 w-6 text-white/30" aria-hidden="true" />
        <p className="text-sm text-white/50">No tasks yet. Create the first one above.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rowError && <Alert variant="error">{rowError}</Alert>}
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">{task.title}</p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${STATUS_STYLES[task.status]}`}
              >
                {task.status}
              </span>
            </div>
            <p className="text-xs text-white/50">
              Reward {formatCurrency(task.rewardAmount)} · {task.frequency === "daily" ? "Daily" : "One-time"} ·
              Starts {formatDate(task.startDate)}
              {task.endDate ? ` · Ends ${formatDate(task.endDate)}` : ""}
              {task.proofRequired ? " · Proof required" : ""}
            </p>
          </div>

          <div className="flex flex-shrink-0 flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(task)}>
              Edit
            </Button>
            {task.status !== "active" && (
              <Button
                variant="outline"
                size="sm"
                disabled={busyId === task.id}
                onClick={() => handleSetStatus(task, "active")}
              >
                Enable
              </Button>
            )}
            {task.status === "active" && (
              <Button
                variant="outline"
                size="sm"
                disabled={busyId === task.id}
                onClick={() => handleSetStatus(task, "disabled")}
              >
                Disable
              </Button>
            )}
            {task.status !== "archived" && (
              <Button
                variant="outline"
                size="sm"
                disabled={busyId === task.id}
                onClick={() => handleSetStatus(task, "archived")}
              >
                Archive
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
