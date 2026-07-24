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

export default function AdminUsersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { users, loading, loadingMore, error, hasMore, isSearching, loadMore, retry } =
    useAdminUsers(searchTerm);
  const { packages } = useAdminPackages();

  const packageNameById = useMemo(
    () => Object.fromEntries(packages.map((pkg) => [pkg.id, pkg.name])),
    [packages],
  );

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchTerm(searchInput);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Users</h1>

      <form onSubmit={handleSearchSubmit} className="flex gap-2">
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

      {!loading && !error && users.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
          <Users className="h-6 w-6 text-white/30" aria-hidden="true" />
          <p className="text-sm text-white/50">
            {isSearching ? "No users match that search." : "No users yet."}
          </p>
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <div className="flex flex-col gap-3">
          {users.map((user) => (
            <UserRow key={user.uid} user={user} packageNameById={packageNameById} />
          ))}
          {!isSearching && <LoadMoreButton hasMore={hasMore} loading={loadingMore} onClick={loadMore} />}
        </div>
      )}
    </div>
  );
}
