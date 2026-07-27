"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminTasks } from "@/features/admin/hooks/use-admin-tasks";
import { TaskForm } from "@/features/admin/components/task-form";
import { TaskList } from "@/features/admin/components/task-list";
import { TaskRewardSettingsForm } from "@/features/admin/components/task-reward-settings-form";
import type { TaskDoc } from "@/lib/firestore/tasks";

export default function AdminTasksPage() {
  const { tasks, loading, error, retry } = useAdminTasks();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDoc | null>(null);

  function openCreateForm() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function openEditForm(task: TaskDoc) {
    setEditingTask(task);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingTask(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        {!formOpen && (
          <Button size="sm" onClick={openCreateForm}>
            New task
          </Button>
        )}
      </div>

      <TaskRewardSettingsForm />

      {formOpen && (
        <TaskForm initialTask={editingTask ?? undefined} onDone={closeForm} onCancel={closeForm} />
      )}

      <TaskList tasks={tasks} loading={loading} error={error} retry={retry} onEdit={openEditForm} />
    </div>
  );
}
