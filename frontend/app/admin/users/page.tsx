"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Trash2, Users as UsersIcon } from "lucide-react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { RequireAdmin } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Role, User } from "@/lib/types";
import {
  Card,
  CardBody,
  Button,
  Input,
  Badge,
  LoadingBlock,
  ErrorAlert,
  EmptyState,
  Modal,
} from "@/components/ui";

const PAGE_SIZE = 50;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [skip, setSkip] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("skip", String(skip));
      params.set("limit", String(PAGE_SIZE));
      if (query.trim()) params.set("search", query.trim());
      const data = await api.get<User[]>(`/admin/users?${params.toString()}`);
      setUsers(data ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [skip, query]);

  useEffect(() => {
    load();
  }, [load]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSkip(0);
    setQuery(search);
  };

  const patchUser = async (
    id: string,
    body: { role?: Role; is_active?: boolean; is_verified?: boolean }
  ) => {
    setBusyId(id);
    setError(null);
    try {
      const updated = await api.patch<User>(`/admin/users/${id}`, body);
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, ...updated } : u))
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to update user.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);
    try {
      await api.del(`/admin/users/${deleteTarget.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <RequireAdmin>
        <PageHeader
          title="Users"
          description="Manage accounts, roles and access."
        />

        <Card className="mb-6">
          <CardBody>
            <form onSubmit={onSearchSubmit} className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Search"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="submit">
                <Search className="h-4 w-4" /> Search
              </Button>
            </form>
          </CardBody>
        </Card>

        {error && (
          <div className="mb-4">
            <ErrorAlert message={error} />
          </div>
        )}

        {loading ? (
          <LoadingBlock label="Loading users…" />
        ) : users.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No users found"
            description="Try a different search term."
          />
        ) : (
          <Card>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-ink-800 dark:text-slate-400">
                      <th className="p-4 font-medium">Name</th>
                      <th className="p-4 font-medium">Email</th>
                      <th className="p-4 font-medium">Role</th>
                      <th className="p-4 font-medium">Active</th>
                      <th className="p-4 font-medium">Verified</th>
                      <th className="p-4 font-medium">Joined</th>
                      <th className="p-4 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-ink-800">
                    {users.map((u) => {
                      const busy = busyId === u.id;
                      return (
                        <tr key={u.id} className="text-slate-700 dark:text-slate-200">
                          <td className="p-4 font-medium text-slate-900 dark:text-slate-100">
                            {u.full_name || "—"}
                          </td>
                          <td className="p-4 text-slate-600 dark:text-slate-400">{u.email}</td>
                          <td className="p-4">
                            <Badge color={u.role === "admin" ? "brand" : "gray"}>
                              {u.role}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge color={u.is_active ? "green" : "gray"}>
                              {u.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <Badge color={u.is_verified ? "green" : "gray"}>
                              {u.is_verified ? "Verified" : "Unverified"}
                            </Badge>
                          </td>
                          <td className="p-4 text-slate-500 dark:text-slate-400">
                            {formatDate(u.created_at)}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                loading={busy}
                                disabled={busy}
                                onClick={() =>
                                  patchUser(u.id, {
                                    is_active: !u.is_active,
                                  })
                                }
                              >
                                {u.is_active ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                loading={busy}
                                disabled={busy}
                                onClick={() =>
                                  patchUser(u.id, {
                                    is_verified: !u.is_verified,
                                  })
                                }
                              >
                                {u.is_verified ? "Unverify" : "Verify"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                loading={busy}
                                disabled={busy}
                                onClick={() =>
                                  patchUser(u.id, {
                                    role:
                                      u.role === "admin" ? "user" : "admin",
                                  })
                                }
                              >
                                Make {u.role === "admin" ? "user" : "admin"}
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={busy}
                                onClick={() => setDeleteTarget(u)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {users.length ? skip + 1 : 0}–{skip + users.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={skip === 0 || loading}
              onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={users.length < PAGE_SIZE || loading}
              onClick={() => setSkip((s) => s + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>

        <Modal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete user"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deleting}
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {deleteTarget?.full_name || deleteTarget?.email}
            </span>
            ? This action cannot be undone.
          </p>
        </Modal>
      </RequireAdmin>
    </AppShell>
  );
}
