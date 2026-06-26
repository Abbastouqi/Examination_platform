"use client";

import { useEffect, useState } from "react";
import { KeyRound, Copy, Check } from "lucide-react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { api, ApiError, API_BASE } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { ApiKey, ApiKeyUsage } from "@/lib/types";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Badge,
  Modal,
  LoadingBlock,
  ErrorAlert,
  EmptyState,
} from "@/components/ui";

const AVAILABLE_SCOPES = [
  "mcq:read",
  "mcq:generate",
  "chat",
  "tests:read",
  "analytics:read",
];

function maskKey(k: ApiKey): string {
  if (k.prefix) return `${k.prefix}…`;
  return "••••••••";
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // create flow
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["mcq:read"]);
  const [expiresDays, setExpiresDays] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // newly-created plaintext key
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedNew, setCopiedNew] = useState(false);

  // usage flow
  const [usageKey, setUsageKey] = useState<ApiKey | null>(null);
  const [usage, setUsage] = useState<ApiKeyUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);

  // revoke flow
  const [revokeKey, setRevokeKey] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  // curl copy
  const [copiedCurl, setCopiedCurl] = useState(false);

  const curlExample = `curl -H "X-API-Key: YOUR_KEY" ${API_BASE}/public/mcqs`;

  async function loadKeys() {
    setLoading(true);
    setError(null);
    try {
      setKeys(await api.get<ApiKey[]>("/api-keys"));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadKeys();
  }, []);

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  }

  function resetCreateForm() {
    setName("");
    setScopes(["mcq:read"]);
    setExpiresDays("");
    setCreateError(null);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setCreateError("Please enter a name for the key.");
      return;
    }
    if (scopes.length === 0) {
      setCreateError("Select at least one scope.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const body: {
        name: string;
        scopes: string[];
        expires_days?: number;
      } = { name: name.trim(), scopes };
      const days = parseInt(expiresDays, 10);
      if (expiresDays.trim() && !Number.isNaN(days)) body.expires_days = days;

      const created = await api.post<ApiKey>("/api-keys", body);
      setCreateOpen(false);
      resetCreateForm();
      if (created.api_key) {
        setNewKey(created.api_key);
        setCopiedNew(false);
      }
      await loadKeys();
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function copyNewKey() {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopiedNew(true);
      setTimeout(() => setCopiedNew(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function copyCurl() {
    try {
      await navigator.clipboard.writeText(curlExample);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function openUsage(key: ApiKey) {
    setUsageKey(key);
    setUsage(null);
    setUsageError(null);
    setUsageLoading(true);
    try {
      setUsage(await api.get<ApiKeyUsage>(`/api-keys/${key.id}/usage`));
    } catch (e) {
      setUsageError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setUsageLoading(false);
    }
  }

  async function handleRevoke() {
    if (!revokeKey) return;
    setRevoking(true);
    setError(null);
    try {
      await api.del(`/api-keys/${revokeKey.id}`);
      setRevokeKey(null);
      await loadKeys();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setRevoking(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="API Keys"
        description="Create and manage API keys to access PrepGenius programmatically."
        action={
          <Button
            onClick={() => {
              resetCreateForm();
              setCreateOpen(true);
            }}
          >
            Create API key
          </Button>
        }
      />

      <div className="space-y-6">
        <ErrorAlert message={error} />

        {/* Keys list */}
        <Card>
          <CardHeader
            title="Your API keys"
            subtitle="Keys grant programmatic access scoped to the permissions you choose."
          />
          <CardBody>
            {loading ? (
              <LoadingBlock label="Loading keys…" />
            ) : keys.length === 0 ? (
              <EmptyState
                icon={KeyRound}
                title="No API keys yet"
                description="Create your first API key to start integrating."
                action={
                  <Button
                    onClick={() => {
                      resetCreateForm();
                      setCreateOpen(true);
                    }}
                  >
                    Create API key
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500 dark:border-ink-800 dark:text-slate-400">
                      <th className="px-2 py-2 font-medium">Name</th>
                      <th className="px-2 py-2 font-medium">Key</th>
                      <th className="px-2 py-2 font-medium">Scopes</th>
                      <th className="px-2 py-2 font-medium">Created</th>
                      <th className="px-2 py-2 font-medium">Last used</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.map((k) => (
                      <tr
                        key={k.id}
                        className="border-b border-slate-50 last:border-0 dark:border-ink-800"
                      >
                        <td className="px-2 py-2 font-medium text-slate-900 dark:text-slate-100">
                          {k.name}
                        </td>
                        <td className="px-2 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {maskKey(k)}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-1">
                            {k.scopes.map((s) => (
                              <Badge key={s} color="brand">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-slate-600 dark:text-slate-400">
                          {formatDateTime(k.created_at)}
                        </td>
                        <td className="px-2 py-2 text-slate-600 dark:text-slate-400">
                          {formatDateTime(k.last_used_at)}
                        </td>
                        <td className="px-2 py-2">
                          <Badge
                            color={k.is_active === false ? "gray" : "green"}
                          >
                            {k.is_active === false ? "Inactive" : "Active"}
                          </Badge>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openUsage(k)}
                            >
                              Usage
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setRevokeKey(k)}
                            >
                              Revoke
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Docs snippet */}
        <Card>
          <CardHeader
            title="Using your API key"
            subtitle="Pass your key in the X-API-Key header."
            action={
              <Button size="sm" variant="outline" onClick={copyCurl}>
                {copiedCurl ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copiedCurl ? "Copied" : "Copy"}
              </Button>
            }
          />
          <CardBody>
            <pre className="overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-xs text-slate-100">
              <code>{curlExample}</code>
            </pre>
          </CardBody>
        </Card>
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => {
          if (!creating) setCreateOpen(false);
        }}
        title="Create API key"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button loading={creating} onClick={handleCreate}>
              Create key
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ErrorAlert message={createError} />
          <Input
            label="Name"
            name="key-name"
            placeholder="e.g. Production server"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Scopes
            </label>
            <div className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-ink-800">
              {AVAILABLE_SCOPES.map((scope) => (
                <label
                  key={scope}
                  className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-ink-800 dark:bg-ink-950"
                    checked={scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                  <span className="font-mono text-xs">{scope}</span>
                </label>
              ))}
            </div>
          </div>
          <Input
            label="Expires in (days, optional)"
            name="expires-days"
            type="number"
            min={1}
            placeholder="Leave blank for no expiry"
            value={expiresDays}
            onChange={(e) => setExpiresDays(e.target.value)}
          />
        </div>
      </Modal>

      {/* Plaintext key reveal modal */}
      <Modal
        open={!!newKey}
        onClose={() => setNewKey(null)}
        title="API key created"
        footer={
          <Button onClick={() => setNewKey(null)}>Done</Button>
        }
      >
        <div className="space-y-3">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Copy now — you won&apos;t see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">
              {newKey}
            </code>
            <Button size="sm" variant="outline" onClick={copyNewKey}>
              {copiedNew ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedNew ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Usage modal */}
      <Modal
        open={!!usageKey}
        onClose={() => setUsageKey(null)}
        title={usageKey ? `Usage — ${usageKey.name}` : "Usage"}
      >
        {usageLoading ? (
          <LoadingBlock label="Loading usage…" />
        ) : usageError ? (
          <ErrorAlert message={usageError} />
        ) : usage ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-ink-950">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total requests
              </p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {usage.total_requests}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                By endpoint
              </p>
              {usage.by_endpoint && usage.by_endpoint.length > 0 ? (
                <div className="space-y-1">
                  {usage.by_endpoint.map((row) => (
                    <div
                      key={row.endpoint}
                      className="flex items-center justify-between border-b border-slate-50 py-1 text-sm last:border-0 dark:border-ink-800"
                    >
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {row.endpoint}
                      </span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No endpoint usage recorded yet.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Revoke confirmation modal */}
      <Modal
        open={!!revokeKey}
        onClose={() => {
          if (!revoking) setRevokeKey(null);
        }}
        title="Revoke API key"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setRevokeKey(null)}
              disabled={revoking}
            >
              Cancel
            </Button>
            <Button variant="danger" loading={revoking} onClick={handleRevoke}>
              Revoke key
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Are you sure you want to revoke{" "}
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {revokeKey?.name}
          </span>
          ? Any application using this key will immediately lose access. This
          cannot be undone.
        </p>
      </Modal>
    </AppShell>
  );
}
