"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  History as HistoryIcon,
  ListChecks,
  Award,
  Gauge,
  Eye,
  BookOpen,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { pct, cn, formatDateTime } from "@/lib/utils";
import AppShell, { PageHeader } from "@/components/AppShell";
import {
  Button,
  Card,
  CardBody,
  Badge,
  StatCard,
  LoadingBlock,
  EmptyState,
  ErrorAlert,
} from "@/components/ui";

interface AttemptRecord {
  id: string;
  test_id: string;
  test_title: string;
  test_type: string;
  status: string;
  score: number;
  total: number;
  correct: number;
  wrong: number;
  skipped: number;
  time_taken_seconds: number;
  created_at: string;
}

type BadgeColor = "green" | "amber" | "red";

function scoreColor(p: number): BadgeColor {
  if (p >= 70) return "green";
  if (p >= 40) return "amber";
  return "red";
}

function formatDuration(seconds?: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

function statusColor(status: string): "accent" | "amber" | "gray" {
  const s = status.toLowerCase();
  if (s === "submitted" || s === "completed") return "accent";
  if (s === "in_progress" || s === "started") return "amber";
  return "gray";
}

function ScoreBadge({ score, total }: { score: number; total: number }) {
  const p = pct(score, total);
  return <Badge color={scoreColor(p)}>{p}%</Badge>;
}

export default function HistoryPage() {
  const [attempts, setAttempts] = useState<AttemptRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<AttemptRecord[]>("/tests/attempts");
        if (active) setAttempts(data);
      } catch (e) {
        if (active)
          setError(e instanceof ApiError ? e.message : "Something went wrong");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const totalAttempts = attempts?.length ?? 0;
  const scores = (attempts ?? []).map((a) => pct(a.score, a.total));
  const avgScore = scores.length
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : 0;
  const bestScore = scores.length ? Math.max(...scores) : 0;

  return (
    <AppShell>
      <PageHeader
        title="Attempt History"
        description="Every mock test you've taken, all in one place."
      />

      {loading ? (
        <LoadingBlock label="Loading your attempts..." />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : !attempts || attempts.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No attempts yet"
          description="Take a mock test and your history will show up here."
          action={
            <Link href="/tests">
              <Button>Take a mock test</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total attempts"
              value={totalAttempts}
              icon={ListChecks}
              color="bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
            />
            <StatCard
              label="Average score"
              value={`${avgScore}%`}
              icon={Gauge}
              color="bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
            />
            <StatCard
              label="Best score"
              value={`${bestScore}%`}
              icon={Award}
              color="bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300"
            />
          </div>

          {/* Mobile: cards */}
          <div className="space-y-3 lg:hidden">
            {attempts.map((a) => (
              <Card key={a.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900 dark:text-slate-100">
                        {a.test_title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge color="brand">{a.test_type}</Badge>
                        <Badge color={statusColor(a.status)}>{a.status}</Badge>
                      </div>
                    </div>
                    <ScoreBadge score={a.score} total={a.total} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{formatDateTime(a.created_at)}</span>
                    <span>
                      {a.correct}/{a.total} correct
                    </span>
                    <span>{formatDuration(a.time_taken_seconds)}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/attempts/${a.id}`} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full">
                        <Eye className="h-4 w-4" /> View result
                      </Button>
                    </Link>
                    <Link href={`/attempts/${a.id}/review`} className="flex-1">
                      <Button size="sm" variant="ghost" className="w-full">
                        <BookOpen className="h-4 w-4" /> Review
                      </Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* Desktop: table */}
          <Card className="hidden lg:block">
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-ink-800 dark:text-slate-400">
                      <th className="px-5 py-3 font-medium">Test</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                      <th className="px-5 py-3 font-medium">Score</th>
                      <th className="px-5 py-3 font-medium">Correct</th>
                      <th className="px-5 py-3 font-medium">Time</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-ink-800 dark:hover:bg-ink-950"
                      >
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1">
                            <Link
                              href={`/attempts/${a.id}`}
                              className="font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-300"
                            >
                              {a.test_title}
                            </Link>
                            <span>
                              <Badge color="brand">{a.test_type}</Badge>
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400">
                          {formatDateTime(a.created_at)}
                        </td>
                        <td className="px-5 py-3">
                          <ScoreBadge score={a.score} total={a.total} />
                        </td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                          {a.correct}/{a.total}
                        </td>
                        <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                          {formatDuration(a.time_taken_seconds)}
                        </td>
                        <td className="px-5 py-3">
                          <Badge color={statusColor(a.status)}>
                            {a.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/attempts/${a.id}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4" /> View result
                              </Button>
                            </Link>
                            <Link href={`/attempts/${a.id}/review`}>
                              <Button size="sm" variant="ghost">
                                <BookOpen className="h-4 w-4" /> Review
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
