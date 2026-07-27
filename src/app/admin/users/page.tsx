"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminUsers } from "@/features/admin/hooks/use-admin-users";
import { useAdminPackages } from "@/features/admin/hooks/use-admin-packages";
import { UserRow } from "@/features/admin/components/user-row";
import { LoadMoreButton } from "@/features/admin/components/load-more-button";
import { SelectField } from "@/components/ui/select-field";
import type { AccountStatus } from "@/lib/firestore/users";

type StatusFilter = AccountStatus | "all";

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All except archived" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "archived", label: "Archived" },
  { value: "banned", label: "Banned" },
];

export default function AdminUsersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  // Archived accounts are a long-term soft-remove — hidden from the
  // default view (matches the "hidden from the default admin user list"
  // Archive semantics) but always one filter selection away for Restore.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const { users, loading, loadingMore, error, hasMore, isSearching, loadMore, retry } =
    useAdminUsers(searchTerm);
  const { packages } = useAdminPackages();

  const packageNameById = useMemo(
    () => Object.fromEntries(packages.map((pkg) => [pkg.id, pkg.name])),
    [packages],
  );

  const filteredUsers = users.filter((user) => {
    if (statusFilter === "all") return user.accountStatus !== "archived";
    return user.accountStatus === statusFilter;
  });

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchTerm(searchInput);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Users</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-2">
          <Input
            placeholder="Search by name, email, or referral code…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" variant="outline" size="md">
            Search
          </Button>
          {isSearching && (
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setSearchInput("");
                setSearchTerm("");
              }}
            >
              Clear
            </Button>
          )}
        </form>

        <SelectField
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          className="sm:max-w-[12rem]"
        >
          {STATUS_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-surface-2 p-6">
          <Alert variant="error">{error}</Alert>
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && filteredUsers.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <Users className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">
            {isSearching
              ? "No users match that search."
              : statusFilter === "all"
                ? "No users yet."
                : `No ${statusFilter} users on this page.`}
          </p>
        </div>
      )}

      {!loading && !error && filteredUsers.length > 0 && (
        <div className="flex flex-col gap-3">
          {filteredUsers.map((user) => (
            <UserRow key={user.uid} user={user} packageNameById={packageNameById} />
          ))}
          {!isSearching && <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />}
        </div>
      )}
    </div>
  );
}
