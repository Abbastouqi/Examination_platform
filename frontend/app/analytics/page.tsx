"use client";

import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  BarChart3,
  Lightbulb,
  CalendarDays,
  FileText,
  Target,
  Crosshair,
  ListChecks,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api, ApiError } from "@/lib/api";
import type {
  AnalyticsOverview,
  StudyPlan,
  StudyPlanRequest,
} from "@/lib/types";
import { EXAM_TYPES } from "@/lib/utils";
import AppShell, { PageHeader } from "@/components/AppShell";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  Badge,
  StatCard,
  LoadingBlock,
  EmptyState,
  ErrorAlert,
} from "@/components/ui";

// Tooltip styling that reads on both light and dark themes.
const chartTooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(148,163,184,0.3)",
  background: "rgba(15,23,42,0.92)",
  color: "#f1f5f9",
  fontSize: 12,
};

function accuracyColor(acc: number): "red" | "amber" | "green" {
  if (acc < 50) return "red";
  if (acc < 75) return "amber";
  return "green";
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [weakAreas, setWeakAreas] = useState<any[]>([]);
  const [weakError, setWeakError] = useState<string | null>(null);

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recError, setRecError] = useState<string | null>(null);

  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [plansError, setPlansError] = useState<string | null>(null);

  // study plan generator form
  const [planType, setPlanType] = useState<string>(EXAM_TYPES[0]);
  const [planSubject, setPlanSubject] = useState("");
  const [planDays, setPlanDays] = useState<number>(7);
  const [planHours, setPlanHours] = useState<number>(2);
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<StudyPlan | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      await Promise.all([
        api
          .get<AnalyticsOverview>("/analytics/overview")
          .then((d) => {
            if (active) setOverview(d);
          })
          .catch((e) => {
            if (active)
              setOverviewError(
                e instanceof ApiError ? e.message : "Something went wrong"
              );
          }),
        api
          .get<any>("/analytics/weak-areas")
          .then((d) => {
            // Backend returns { weak_areas: [{area, accuracy, reason}], ... }
            if (active) setWeakAreas(Array.isArray(d?.weak_areas) ? d.weak_areas : []);
          })
          .catch((e) => {
            if (active)
              setWeakError(
                e instanceof ApiError ? e.message : "Something went wrong"
              );
          }),
        api
          .get<any>("/analytics/recommendations")
          .then((d) => {
            // Backend returns { recommended: [{topic, accuracy, attempted, reason}], ... }
            if (active) setRecommendations(Array.isArray(d?.recommended) ? d.recommended : []);
          })
          .catch((e) => {
            if (active)
              setRecError(
                e instanceof ApiError ? e.message : "Something went wrong"
              );
          }),
        api
          .get<StudyPlan[]>("/analytics/study-plans")
          .then((d) => {
            if (active) setStudyPlans(d || []);
          })
          .catch((e) => {
            if (active)
              setPlansError(
                e instanceof ApiError ? e.message : "Something went wrong"
              );
          }),
      ]);
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGenError(null);
    const body: StudyPlanRequest = {
      test_type: planType,
      subject: planSubject.trim(),
      days: planDays,
      hours_per_day: planHours,
    };
    try {
      const plan = await api.post<StudyPlan>("/analytics/study-plan", body);
      setGeneratedPlan(plan);
      setStudyPlans((prev) => [plan, ...prev]);
    } catch (e) {
      setGenError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  const scoreTrend = overview?.score_trend ?? [];
  // Backend per_subject items carry `accuracy` (0..1); the bar needs a 0..100 `score`.
  const perSubject = (overview?.per_subject ?? []).map((s: any) => ({
    subject: s.subject,
    score: Math.round((s.accuracy ?? 0) * 100),
  }));

  if (loading) {
    return (
      <AppShell>
        <LoadingBlock label="Loading analytics..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Analytics"
        description="Track your progress, spot weak areas and plan your study."
      />

      {/* Overview stat widgets */}
      {overview && (
        <div className="mb-6 grid animate-fade-up gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total tests"
            value={(overview as any).total_tests ?? 0}
            icon={FileText}
          />
          <StatCard
            label="Average score"
            value={`${Math.round((overview as any).avg_score ?? 0)}%`}
            icon={Target}
            color="bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300"
          />
          <StatCard
            label="Overall accuracy"
            value={`${Math.round(((overview as any).overall_accuracy ?? 0) * 100)}%`}
            icon={Crosshair}
            color="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
          />
          <StatCard
            label="Questions answered"
            value={(overview as any).total_questions ?? 0}
            icon={ListChecks}
            color="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
          />
        </div>
      )}

      {/* Overview charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Score trend" subtitle="Recent test scores over time" />
          <CardBody>
            {overviewError ? (
              <ErrorAlert message={overviewError} />
            ) : scoreTrend.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No score history yet"
                description="Take a few tests to see your score trend."
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={scoreTrend}
                  margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#94a3b8"
                    strokeOpacity={0.25}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    stroke="#94a3b8"
                  />
                  <Tooltip contentStyle={chartTooltipStyle} cursor={{ stroke: "#94a3b8", strokeOpacity: 0.3 }} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#6366f1" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Performance by subject" subtitle="Average score per subject" />
          <CardBody>
            {overviewError ? (
              <ErrorAlert message={overviewError} />
            ) : perSubject.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No subject data yet"
                description="Subject performance will appear once you take tests."
              />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={perSubject}
                  margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#94a3b8"
                    strokeOpacity={0.25}
                  />
                  <XAxis
                    dataKey="subject"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    stroke="#94a3b8"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    stroke="#94a3b8"
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    cursor={{ fill: "#94a3b8", fillOpacity: 0.1 }}
                  />
                  <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Weak areas + recommendations */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Weak areas" subtitle="Topics that need attention" />
          <CardBody>
            {weakError ? (
              <ErrorAlert message={weakError} />
            ) : weakAreas.length === 0 ? (
              <EmptyState
                title="No weak areas"
                description="Great — nothing flagged yet."
              />
            ) : (
              <div className="space-y-3">
                {weakAreas.map((w, i) => (
                  <div
                    key={`${w.area ?? w.topic}-${i}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:border-ink-800 dark:bg-ink-950 dark:hover:bg-ink-800"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {w.area ?? w.topic}
                      </p>
                      {w.reason && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {w.reason}
                        </p>
                      )}
                    </div>
                    <Badge color={accuracyColor(w.accuracy ?? 0)}>
                      {Math.round(w.accuracy ?? 0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recommendations" subtitle="Suggested next steps" />
          <CardBody>
            {recError ? (
              <ErrorAlert message={recError} />
            ) : recommendations.length === 0 ? (
              <EmptyState
                icon={Lightbulb}
                title="No recommendations"
                description="Recommendations will appear as we learn your patterns."
              />
            ) : (
              <div className="space-y-3">
                {recommendations.map((r, i) => {
                  const accPct =
                    r.accuracy == null
                      ? null
                      : r.accuracy <= 1
                      ? r.accuracy * 100
                      : r.accuracy;
                  return (
                    <div
                      key={`${r.topic ?? r.title}-${i}`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:bg-slate-100 dark:border-ink-800 dark:bg-ink-950 dark:hover:bg-ink-800"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {r.topic ?? r.title}
                        </p>
                        {accPct != null && (
                          <Badge color={accuracyColor(accPct)}>
                            {Math.round(accPct)}%
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {r.reason ?? r.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Study plan generator */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader title="Generate study plan" subtitle="Tailored to your timeline" />
            <CardBody>
              <form onSubmit={handleGenerate} className="space-y-4">
                <Select
                  label="Exam type"
                  name="test_type"
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value)}
                >
                  {EXAM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Subject"
                  name="subject"
                  value={planSubject}
                  onChange={(e) => setPlanSubject(e.target.value)}
                  placeholder="e.g. General Knowledge"
                  required
                />
                <Input
                  label="Days"
                  name="days"
                  type="number"
                  min={1}
                  value={planDays}
                  onChange={(e) => setPlanDays(Number(e.target.value))}
                  required
                />
                <Input
                  label="Hours per day"
                  name="hours_per_day"
                  type="number"
                  min={1}
                  value={planHours}
                  onChange={(e) => setPlanHours(Number(e.target.value))}
                  required
                />
                <ErrorAlert message={genError} />
                <Button type="submit" loading={generating} className="w-full">
                  Generate plan
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {generatedPlan && (
            <Card>
              <CardHeader
                title="Your study plan"
                subtitle={`${generatedPlan.test_type} · ${generatedPlan.subject} · ${generatedPlan.days} days`}
              />
              <CardBody>
                {(generatedPlan.plan ?? []).length === 0 ? (
                  <EmptyState
                    title="Empty plan"
                    description="The generated plan has no days."
                  />
                ) : (
                  <div className="space-y-3">
                    {generatedPlan.plan.map((d) => (
                      <div
                        key={d.day}
                        className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-ink-800 dark:bg-ink-950"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            Day {d.day}
                            {d.focus ? ` · ${d.focus}` : ""}
                          </p>
                          {d.hours != null && (
                            <Badge color="brand">{d.hours}h</Badge>
                          )}
                        </div>
                        {(d.topics ?? []).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {d.topics.map((topic, ti) => (
                              <span
                                key={ti}
                                className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-ink-900 dark:text-slate-300 dark:ring-ink-800"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Existing study plans" subtitle="Previously generated plans" />
            <CardBody>
              {plansError ? (
                <ErrorAlert message={plansError} />
              ) : studyPlans.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No study plans yet"
                  description="Generate your first study plan using the form."
                />
              ) : (
                <div className="space-y-2">
                  {studyPlans.map((p, i) => (
                    <div
                      key={p.id ?? i}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:bg-slate-100 dark:border-ink-800 dark:bg-ink-950 dark:hover:bg-ink-800"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {p.subject}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {p.test_type} · {p.days} days · {p.hours_per_day}h/day
                        </p>
                      </div>
                      <Badge color="gray">{(p.plan ?? []).length} days</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
