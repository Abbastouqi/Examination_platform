"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ScrollText } from "lucide-react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { RequireAdmin } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import type { LogEntry } from "@/lib/types";
import {
  Card,
  CardBody,
  Button,
  Select,
  Badge,
  LoadingBlock,
  ErrorAlert,
  EmptyState,
} from "@/components/ui";

const LEVELS = ["all", "debug", "info", "warning", "error"] as const;

type BadgeColor = "red" | "amber" | "blue" | "gray";

function levelColor(level: string): BadgeColor {
  switch (level.toLowerCase()) {
    case "error":
      return "red";
    case "warning":
      return "amber";
    case "info":
      return "blue";
    case "debug":
    default:
      return "gray";
  }
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [level, setLevel] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const path =
        level === "all"
          ? "/admin/logs"
          : `/admin/logs?level=${encodeURIComponent(level)}`;
      const data = await api.get<LogEntry[]>(path);
      setLogs(data ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppShell>
      <RequireAdmin>
        <PageHeader
          title="System Logs"
          description="Recent platform activity and events."
        />

        <Card className="mb-6">
          <CardBody className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:w-56">
              <Select
                label="Level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l === "all" ? "All levels" : l}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          </CardBody>
        </Card>

        {error && (
          <div className="mb-4">
            <ErrorAlert message={error} />
          </div>
        )}

        {loading ? (
          <LoadingBlock label="Loading logs…" />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="No logs found"
            description="There are no log entries for this filter."
          />
        ) : (
          <Card>
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-ink-800 dark:text-slate-400">
                      <th className="p-4 font-medium">Timestamp</th>
                      <th className="p-4 font-medium">Level</th>
                      <th className="p-4 font-medium">Source</th>
                      <th className="p-4 font-medium">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-ink-800">
                    {logs.map((log, i) => (
                      <tr key={log.id ?? i} className="align-top text-slate-700 dark:text-slate-200">
                        <td className="whitespace-nowrap p-4 text-slate-500 dark:text-slate-400">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="p-4">
                          <Badge color={levelColor(log.level)}>
                            {log.level}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap p-4 text-slate-600 dark:text-slate-400">
                          {log.source || "—"}
                        </td>
                        <td className="p-4">
                          <span className="whitespace-pre-wrap break-words font-mono text-xs text-slate-700 dark:text-slate-300">
                            {log.message}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}
      </RequireAdmin>
    </AppShell>
  );
}
