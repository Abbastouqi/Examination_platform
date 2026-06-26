"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  BookOpen,
  Award,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { api, ApiError } from "@/lib/api";
import type { TestResult } from "@/lib/types";
import { pct, cn } from "@/lib/utils";
import AppShell, { PageHeader } from "@/components/AppShell";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  LoadingBlock,
  EmptyState,
  ErrorAlert,
} from "@/components/ui";

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card className="hover:shadow-cardhover">
      <CardBody className="flex items-center gap-4">
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {value}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        </div>
      </CardBody>
    </Card>
  );
}

function ScoreRing({ percentage }: { percentage: number }) {
  const size = 160;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (clamped / 100) * circumference;
  const ringColor =
    clamped >= 70 ? "#10b981" : clamped >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score ${percentage} percent`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-100 dark:stroke-ink-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">
          {percentage}%
        </span>
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Score
        </span>
      </div>
    </div>
  );
}

export default function AttemptResultPage({
  params,
}: {
  params: { attemptId: string };
}) {
  const { attemptId } = params;
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<TestResult>(
          `/tests/attempts/${attemptId}/result`
        );
        if (active) setResult(data);
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
  }, [attemptId]);

  if (loading) {
    return (
      <AppShell>
        <LoadingBlock label="Loading result..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <PageHeader title="Test Result" />
        <ErrorAlert message={error} />
      </AppShell>
    );
  }

  if (!result) {
    return (
      <AppShell>
        <PageHeader title="Test Result" />
        <EmptyState
          title="No result found"
          description="We couldn't find a result for this attempt."
        />
      </AppShell>
    );
  }

  const percentage = pct(result.score, result.total);
  // Backend returns per_topic as an object: { "<topic>": { correct, total } }.
  // Be robust to either an object or an array shape.
  const rawPerTopic: any = result.per_topic ?? {};
  const chartData = Array.isArray(rawPerTopic)
    ? rawPerTopic.map((t: any) => ({ topic: t.topic, correct: t.correct ?? 0, total: t.total ?? 0 }))
    : Object.entries(rawPerTopic).map(([topic, v]: [string, any]) => ({
        topic,
        correct: v?.correct ?? 0,
        total: v?.total ?? 0,
      }));

  const passed = percentage >= 70;
  const headline = passed
    ? "Excellent work!"
    : percentage >= 40
    ? "Good effort — keep going!"
    : "Keep practicing!";

  return (
    <AppShell>
      <PageHeader
        title="Test Result"
        description="Your performance summary for this attempt."
        action={
          <Link href={`/attempts/${attemptId}/review`}>
            <Button variant="outline">
              <BookOpen className="h-4 w-4" /> Review answers
            </Button>
          </Link>
        }
      />

      {/* Hero score */}
      <Card className="mb-6 overflow-hidden">
        <div className="relative">
          <div
            className={cn(
              "absolute inset-0 opacity-60",
              passed
                ? "bg-gradient-to-br from-accent-50 to-transparent dark:from-accent-500/10"
                : "bg-gradient-to-br from-brand-50 to-transparent dark:from-brand-500/10"
            )}
          />
          <CardBody className="relative flex flex-col items-center gap-6 py-10 text-center sm:flex-row sm:justify-center sm:gap-12 sm:text-left">
            <ScoreRing percentage={percentage} />
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                  passed
                    ? "bg-accent-50 text-accent-700 ring-accent-200 dark:bg-accent-500/15 dark:text-accent-300 dark:ring-accent-500/30"
                    : "bg-gold-400/15 text-gold-600 ring-gold-400/30 dark:text-gold-400"
                )}
              >
                <Award className="h-3.5 w-3.5" />
                {headline}
              </span>
              <p className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                {result.score}
                <span className="text-2xl text-slate-400 dark:text-slate-500">
                  {" "}
                  / {result.total}
                </span>
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                You answered {result.correct} of {result.total} questions
                correctly.
              </p>
            </div>
          </CardBody>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Correct"
          value={result.correct}
          icon={CheckCircle2}
          color="bg-green-50 text-green-600 dark:bg-green-500/15 dark:text-green-300"
        />
        <StatCard
          label="Wrong"
          value={result.wrong}
          icon={XCircle}
          color="bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300"
        />
        <StatCard
          label="Skipped"
          value={result.skipped}
          icon={MinusCircle}
          color="bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-300"
        />
      </div>

      {/* Per-topic breakdown */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4 text-brand-600 dark:text-brand-300" />
              Per-topic breakdown
            </span>
          }
          subtitle="Correct vs total by topic"
        />
        <CardBody>
          {chartData.length === 0 ? (
            <EmptyState
              title="No topic data"
              description="There is no per-topic breakdown for this attempt."
            />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                  <XAxis
                    dataKey="topic"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                    stroke="#94a3b8"
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#94a3b8" }} stroke="#94a3b8" />
                  <Tooltip
                    cursor={{ fill: "#94a3b8", fillOpacity: 0.1 }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.3)",
                      background: "rgba(17,23,38,0.95)",
                      color: "#e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="total" fill="#94a3b8" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="correct" fill="#6366f1" name="Correct" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-ink-800 dark:text-slate-400">
                      <th className="py-2 pr-4 font-medium">Topic</th>
                      <th className="py-2 pr-4 font-medium">Correct</th>
                      <th className="py-2 pr-4 font-medium">Total</th>
                      <th className="py-2 font-medium">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((t) => {
                      const acc = pct(t.correct, t.total);
                      return (
                        <tr
                          key={t.topic}
                          className="border-b border-slate-100 text-slate-800 dark:border-ink-800 dark:text-slate-200"
                        >
                          <td className="py-2.5 pr-4 font-medium">{t.topic}</td>
                          <td className="py-2.5 pr-4">{t.correct}</td>
                          <td className="py-2.5 pr-4">{t.total}</td>
                          <td className="py-2.5">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset",
                                acc >= 70
                                  ? "bg-accent-50 text-accent-700 ring-accent-200 dark:bg-accent-500/15 dark:text-accent-300 dark:ring-accent-500/30"
                                  : acc >= 40
                                  ? "bg-gold-400/15 text-gold-600 ring-gold-400/30 dark:text-gold-400"
                                  : "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30"
                              )}
                            >
                              {acc}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </AppShell>
  );
}
