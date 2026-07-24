"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/components/ui/form-field";
import { useAuth } from "@/features/auth/context/auth-provider";
import { sendNotificationAction } from "@/features/admin/lib/notification-actions";
import { NotificationUserPicker } from "@/features/admin/components/notification-user-picker";
import { getAuthErrorMessage } from "@/features/auth/lib/auth-errors";
import type { NotificationAudienceType } from "@/lib/firestore/announcements";
import type { UserDoc } from "@/lib/firestore/users";

type NotificationComposeFormProps = {
  onSent: () => void;
};

export function NotificationComposeForm({ onSent }: NotificationComposeFormProps) {
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] = useState<NotificationAudienceType>("all");
  const [selectedUsers, setSelectedUsers] = useState<UserDoc[]>([]);

  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !user) return;
    setFormError(null);
    setSuccess(null);

    if (!title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!body.trim()) {
      setFormError("Message body is required.");
      return;
    }
    if (audienceType === "selected" && selectedUsers.length === 0) {
      setFormError("Select at least one user.");
      return;
    }

    setSubmitting(true);
    try {
      const count = await sendNotificationAction(
        {
          title: title.trim(),
          body: body.trim(),
          audienceType,
          selectedUids: selectedUsers.map((entry) => entry.uid),
        },
        { adminUid: user.uid, adminName: user.displayName ?? user.email ?? "Admin" },
      );
      setSuccess(`Sent to ${count} recipient(s).`);
      setTitle("");
      setBody("");
      setSelectedUsers([]);
      onSent();
    } catch (error) {
      setFormError(getAuthErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-surface-2 p-4 sm:p-6"
    >
      <h2 className="text-sm font-semibold text-white">Send a notification</h2>

      {formError && <Alert variant="error">{formError}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <FormField label="Title" type="text" value={title} onChange={(event) => setTitle(event.target.value)} />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Message</label>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-white/80">Audience</label>
        <select
          value={audienceType}
          onChange={(event) => setAudienceType(event.target.value as NotificationAudienceType)}
          className="rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white transition-colors focus:border-brand focus:outline-none"
        >
          <option value="all">All users</option>
          <option value="active_package">Active package users</option>
          <option value="selected">Selected users</option>
        </select>
      </div>

      {audienceType === "selected" && (
        <NotificationUserPicker selected={selectedUsers} onChange={setSelectedUsers} />
      )}

      <Button type="submit" size="md" disabled={submitting} className="self-start">
        {submitting ? <Spinner /> : "Send notification"}
      </Button>
    </form>
  );
}
