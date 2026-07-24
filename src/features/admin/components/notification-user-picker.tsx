"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useAdminUsers } from "@/features/admin/hooks/use-admin-users";
import type { UserDoc } from "@/lib/firestore/users";

type NotificationUserPickerProps = {
  selected: UserDoc[];
  onChange: (users: UserDoc[]) => void;
};

export function NotificationUserPicker({ selected, onChange }: NotificationUserPickerProps) {
  const [search, setSearch] = useState("");
  const { users, loading } = useAdminUsers(search);
  const selectedUids = new Set(selected.map((user) => user.uid));

  function toggle(user: UserDoc) {
    if (selectedUids.has(user.uid)) {
      onChange(selected.filter((entry) => entry.uid !== user.uid));
    } else {
      onChange([...selected, user]);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        placeholder="Search by name, email, or referral code…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-xl border border-white/15 bg-surface-3 px-4 py-2.5 text-sm text-white placeholder:text-white/30 transition-colors focus:border-brand focus:outline-none"
      />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((user) => (
            <span
              key={user.uid}
              className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-xs text-white"
            >
              {user.fullName}
              <button type="button" onClick={() => toggle(user)} aria-label={`Remove ${user.fullName}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {search.trim() && (
        <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-xl border border-white/10 p-2">
          {loading && <p className="px-2 py-1 text-xs text-white/40">Searching…</p>}
          {!loading && users.length === 0 && (
            <p className="px-2 py-1 text-xs text-white/40">No matching users.</p>
          )}
          {!loading &&
            users.map((user) => (
              <button
                key={user.uid}
                type="button"
                onClick={() => toggle(user)}
                className={`flex flex-col items-start rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                  selectedUids.has(user.uid) ? "bg-brand/20 text-white" : "text-white/70 hover:bg-white/5"
                }`}
              >
                <span className="font-medium">{user.fullName}</span>
                <span className="text-white/40">{user.email}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
