"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  MessageSquare,
  BarChart3,
  ArrowRight,
  Target,
  ListChecks,
  Trophy as TrophyIcon,
  Crosshair,
  TrendingUp,
  Lightbulb,
  ChevronRight,
  CalendarClock,
  CalendarCheck,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { formatDate, pct } from "@/lib/utils";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Badge,
  StatCard,
  UsageMeter,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import {
  HeroStudy,
  BooksStack,
  Squiggle,
  TargetDoodle,
  BotMascot,
} from "@/components/Illustrations";

// ---- Local types matching the live /analytics endpoints (more accurate than
// the legacy shapes in lib/types.ts; defined here to avoid touching shared types).
interface UsageFeature {
  used: number;
  limit: number;
  unlimited: boolean;
}
interface Usage {
  plan: string;
  date?: string;
  features?: {
    mcq?: UsageFeature;
    chat?: UsageFeature;
    mocktest?: UsageFeature;
  };
}
interface SubjectStat {
  subject: string;
  accuracy: number; // 0..1
  correct?: number;
  total?: number;
}
interface TrendPoint {
  date: string | null;
  score: number;
}
interface RecentAttempt {
  attempt_id: string;
  test_id?: string | null;
  test_title?: string | null;
  test_type?: string | null;
  score?: number | null;
  total?: number | null;
  correct?: number | null;
  wrong?: number | null;
  skipped?: number | null;
  time_taken_seconds?: number | null;
  created_at?: string | null;
}
interface Overview {
  total_tests?: number;
  avg_score?: number;
  total_questions?: number;
  overall_accuracy?: number; // 0..1
  per_subject?: SubjectStat[];
  per_topic?: unknown[];
  score_trend?: TrendPoint[];
  recent_attempts?: RecentAttempt[];
}
interface RecommendedTopic {
  topic: string;
  accuracy?: number; // 0..1
  attempted?: number;
  reason?: string;
}
interface Recommendations {
  recommended?: RecommendedTopic[];
  ai_recommended_topics?: string[];
}

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const num = (v: unknown, d = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : d;

// Compact pastel quick-action pills shown inside the hero.
const QUICK_ACTIONS = [
  {
    href: "/tests",
    label: "Start Mock Test",
    icon: FileText,
    tile: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
  },
  {
    href: "/mcq",
    label: "Generate MCQs",
    icon: Sparkles,
    tile: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  },
  {
    href: "/chat",
    label: "Ask AI Tutor",
    icon: MessageSquare,
    tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
  {
    href: "/analytics",
    label: "View Analytics",
    icon: BarChart3,
    tile: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
  },
];

// Bigger illustrated pastel "category" cards (section 3).
const CATEGORY_CARDS = [
  {
    href: "/mcq",
    title: "Practice MCQs",
    desc: "Sharpen recall with AI-generated questions",
    icon: Sparkles,
    bg: "bg-violet-100 dark:bg-violet-500/10",
    ring: "ring-violet-200/70 dark:ring-violet-400/20",
    tile: "bg-violet-200 text-violet-700 dark:bg-violet-500/25 dark:text-violet-100",
  },
  {
    href: "/tests",
    title: "Take a Mock Test",
    desc: "Simulate the real exam under timed conditions",
    icon: FileText,
    bg: "bg-amber-100 dark:bg-amber-500/10",
    ring: "ring-amber-200/70 dark:ring-amber-400/20",
    tile: "bg-amber-200 text-amber-700 dark:bg-amber-500/25 dark:text-amber-100",
  },
  {
    href: "/chat",
    title: "AI Tutor",
    desc: "Ask anything and get instant explanations",
    icon: MessageSquare,
    bg: "bg-emerald-100 dark:bg-emerald-500/10",
    ring: "ring-emerald-200/70 dark:ring-emerald-400/20",
    tile: "bg-emerald-200 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-100",
  },
  {
    href: "/analytics",
    title: "Study Plan",
    desc: "Review weak areas and track your progress",
    icon: CalendarCheck,
    bg: "bg-rose-100 dark:bg-rose-500/10",
    ring: "ring-rose-200/70 dark:ring-rose-400/20",
    tile: "bg-rose-200 text-rose-700 dark:bg-rose-500/25 dark:text-rose-100",
  },
];

function ChartTooltipStyle() {
  return {
    contentStyle: {
      borderRadius: 12,
      border: "1px solid rgba(148,163,184,0.25)",
      background: "rgba(17,23,38,0.95)",
      color: "#e2e8f0",
      fontSize: 12,
      boxShadow: "0 8px 24px -8px rgba(0,0,0,0.4)",
    },
    labelStyle: { color: "#94a3b8" },
    cursor: { fill: "rgba(148,163,184,0.08)" },
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [recs, setRecs] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      // Fetch independently so one failing widget never blanks the page.
      const [uRes, oRes, rRes] = await Promise.allSettled([
        api.get<Usage>("/users/me/usage"),
        api.get<Overview>("/analytics/overview"),
        api.get<Recommendations>("/analytics/recommendations"),
      ]);
      if (!active) return;

      if (uRes.status === "fulfilled") setUsage(uRes.value);
      else
        setUsageError(
          uRes.reason instanceof ApiError
            ? uRes.reason.message
            : "Couldn't load your plan usage."
        );

      if (oRes.status === "fulfilled") setOverview(oRes.value);
      else
        setOverviewError(
          oRes.reason instanceof ApiError
            ? oRes.reason.message
            : "Couldn't load your analytics."
        );

      if (rRes.status === "fulfilled") setRecs(rRes.value);
      // recommendations are nice-to-have; ignore failures silently

      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const firstName = (user?.full_name || "").trim().split(/\s+/)[0] || "there";

  const totalTests = num(overview?.total_tests);
  const avgScore = num(overview?.avg_score);
  const accuracyPct = Math.round(num(overview?.overall_accuracy) * 100);
  const totalQuestions = num(overview?.total_questions);

  const recent = arr<RecentAttempt>(overview?.recent_attempts);
  const subjectData = arr<SubjectStat>(overview?.per_subject).map((s) => ({
    subject: s.subject || "—",
    score: Math.round(num(s.accuracy) * 100),
  }));
  const trendData = arr<TrendPoint>(overview?.score_trend)
    .filter((p) => p && p.date)
    .map((p, i) => ({
      label: p.date ? formatDate(p.date) : `#${i + 1}`,
      score: Math.round(num(p.score)),
    }));

  const recommended = arr<RecommendedTopic>(recs?.recommended).slice(0, 3);

  const plan = (usage?.plan || "free").toLowerCase();
  const isFreePlan = plan === "free" || plan === "";
  const planColor: "gray" | "brand" | "amber" =
    plan === "premium" ? "amber" : plan === "pro" ? "brand" : "gray";

  const stats = [
    {
      label: "Tests taken",
      value: totalTests,
      icon: ListChecks,
      color:
        "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
    },
    {
      label: "Average score",
      value: `${Math.round(avgScore)}%`,
      icon: TrophyIcon,
      color:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    },
    {
      label: "Accuracy",
      value: `${accuracyPct}%`,
      icon: Crosshair,
      color:
        "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
    },
    {
      label: "Questions practiced",
      value: totalQuestions,
      icon: Target,
      color: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
    },
  ];

  return (
    <AppShell>
      {/* ---- Friendly hero / greeting band ---- */}
      <div className="doodle-bg shadow-soft animate-fade-up relative mb-7 overflow-hidden rounded-3xl border border-cream-200 p-6 dark:border-ink-800 sm:p-8">
        <div className="relative flex items-center gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[1.95rem]">
              Hi, <span className="text-gradient">{firstName}</span>! 👋
            </h1>
            <Squiggle className="mt-1 h-3 w-20 text-orange-500" />
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-300 sm:text-base">
              What would you like to prepare today? Pick up where you left off
              or start something new.
            </p>

            {/* Quick-action pills */}
            <div className="mt-5 flex flex-wrap gap-2.5">
              {QUICK_ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="group inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-ink-800 dark:bg-ink-900/70 dark:text-slate-200"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-xl ${a.tile}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    {a.label}
                    <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Hero illustration — hidden on small screens */}
          <div className="hidden shrink-0 lg:block">
            <HeroStudy className="h-44 w-52 text-slate-900 drop-shadow-sm dark:text-slate-100" />
          </div>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-7">
          {/* ---- Stat widgets ---- */}
          <div className="animate-fade-up grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
                value={s.value}
                icon={s.icon}
                color={s.color}
              />
            ))}
          </div>

          {/* ---- Pastel category quick cards ---- */}
          <div className="animate-fade-up grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_CARDS.map((c) => {
              const Icon = c.icon;
              return (
                <Link
                  key={c.href}
                  href={c.href}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 ring-1 transition-all hover:-translate-y-1 hover:shadow-soft ${c.bg} ${c.ring}`}
                >
                  <span
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${c.tile}`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-display text-base font-bold text-slate-900 dark:text-slate-50">
                      {c.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {c.desc}
                    </p>
                  </div>
                  <ArrowRight className="absolute right-4 top-5 h-4 w-4 text-slate-500/70 transition-transform group-hover:translate-x-1 dark:text-slate-300/70" />
                </Link>
              );
            })}
          </div>

          {/* ---- Charts row ---- */}
          <div className="animate-fade-up grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Score trend */}
            <Card className="rounded-3xl">
              <CardHeader
                title="Score trend"
                subtitle="Your scores over recent attempts"
                action={
                  <span className="rounded-xl bg-violet-100 p-2 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                }
              />
              <CardBody>
                {trendData.length === 0 ? (
                  <EmptyState
                    icon={TrendingUp}
                    title="No score history yet"
                    description="Complete a mock test to start tracking your progress."
                  />
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={trendData}
                        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#94a3b8"
                          strokeOpacity={0.18}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 100]}
                        />
                        <Tooltip {...ChartTooltipStyle()} />
                        <Line
                          type="monotone"
                          dataKey="score"
                          name="Score"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Performance by subject */}
            <Card className="rounded-3xl">
              <CardHeader
                title="Performance by subject"
                subtitle="Accuracy across your tested subjects"
                action={
                  <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                }
              />
              <CardBody>
                {subjectData.length === 0 ? (
                  <EmptyState
                    icon={BarChart3}
                    title="No subject data yet"
                    description="Take tests across subjects to see how you stack up."
                  />
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={subjectData}
                        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#94a3b8"
                          strokeOpacity={0.18}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="subject"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          domain={[0, 100]}
                        />
                        <Tooltip {...ChartTooltipStyle()} />
                        <Bar
                          dataKey="score"
                          name="Accuracy %"
                          fill="#10b981"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={48}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {overviewError && (
            <Card className="rounded-3xl">
              <CardBody>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {overviewError}
                </p>
              </CardBody>
            </Card>
          )}

          {/* ---- Usage + Recommendations ---- */}
          <div className="animate-fade-up grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Usage / plan */}
            <Card className="rounded-3xl lg:col-span-2">
              <CardHeader
                title="Plan usage"
                subtitle="Your limits for this period"
                action={<Badge color={planColor}>{usage?.plan || "Free"}</Badge>}
              />
              <CardBody className="space-y-5">
                {usageError ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {usageError}
                  </p>
                ) : (
                  <>
                    <UsageMeter
                      label="MCQs"
                      used={num(usage?.features?.mcq?.used)}
                      limit={num(usage?.features?.mcq?.limit)}
                      unlimited={usage?.features?.mcq?.unlimited ?? false}
                    />
                    <UsageMeter
                      label="AI Tutor chats"
                      used={num(usage?.features?.chat?.used)}
                      limit={num(usage?.features?.chat?.limit)}
                      unlimited={usage?.features?.chat?.unlimited ?? false}
                    />
                    <UsageMeter
                      label="Mock tests"
                      used={num(usage?.features?.mocktest?.used)}
                      limit={num(usage?.features?.mocktest?.limit)}
                      unlimited={usage?.features?.mocktest?.unlimited ?? false}
                    />
                    {isFreePlan && (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-brand-200 bg-brand-50/60 px-4 py-3 dark:border-brand-500/30 dark:bg-brand-500/10">
                        <div className="flex items-center gap-3">
                          <BooksStack className="hidden h-9 w-9 shrink-0 text-brand-700 dark:text-brand-200 sm:block" />
                          <p className="text-sm font-medium text-brand-700 dark:text-brand-200">
                            Need more? Upgrade for higher limits.
                          </p>
                        </div>
                        <Link href="/billing">
                          <Button size="sm" variant="primary">
                            Upgrade
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </CardBody>
            </Card>

            {/* Recommendations / weak areas */}
            <Card className="rounded-3xl">
              <CardHeader
                title="Focus areas"
                subtitle="Topics to prioritise next"
                action={
                  <span className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                    <Lightbulb className="h-4 w-4" />
                  </span>
                }
              />
              <CardBody>
                {recommended.length === 0 ? (
                  <EmptyState
                    icon={Lightbulb}
                    title="No recommendations yet"
                    description="Take a few tests and we'll highlight your weak spots."
                  />
                ) : (
                  <div className="space-y-3">
                    {recommended.map((r, i) => (
                      <div
                        key={`${r.topic}-${i}`}
                        className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-3 dark:border-amber-500/20 dark:bg-amber-500/10"
                      >
                        <TargetDoodle className="mt-0.5 h-7 w-7 shrink-0 text-slate-800 dark:text-slate-100" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                              {r.topic}
                            </p>
                            <Badge color={num(r.accuracy) < 0.5 ? "red" : "amber"}>
                              {Math.round(num(r.accuracy) * 100)}%
                            </Badge>
                          </div>
                          {r.reason && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {r.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    <Link
                      href="/analytics"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
                    >
                      View full analytics
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* ---- Recent tests ---- */}
          <Card className="animate-fade-up rounded-3xl">
            <CardHeader
              title="Recent tests"
              subtitle="Your latest attempts"
              action={
                recent.length > 0 ? (
                  <Link
                    href="/analytics"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
                  >
                    See all
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : undefined
              }
            />
            <CardBody>
              {recent.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title="No attempts yet"
                  description="Take a mock test to see your results show up here."
                  action={
                    <Link href="/tests">
                      <Button size="sm">
                        <FileText className="h-4 w-4" />
                        Start a test
                      </Button>
                    </Link>
                  }
                />
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-ink-800">
                  {recent.map((a) => {
                    const score = num(a.score);
                    const total = num(a.total);
                    const percent = pct(score, total);
                    const scoreColor =
                      percent >= 70
                        ? "text-accent-600 dark:text-accent-300"
                        : percent >= 40
                        ? "text-amber-600 dark:text-amber-300"
                        : "text-red-600 dark:text-red-300";
                    return (
                      <li key={a.attempt_id}>
                        <Link
                          href={`/attempts/${a.attempt_id}`}
                          className="group -mx-2 flex items-center gap-4 rounded-2xl px-2 py-3 transition-colors hover:bg-cream-100 dark:hover:bg-ink-950"
                        >
                          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200 sm:flex">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                              {a.test_title || "Untitled test"}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                              {a.test_type && (
                                <Badge color="gray">{a.test_type}</Badge>
                              )}
                              <span>{formatDate(a.created_at)}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-semibold ${scoreColor}`}>
                              {score} / {total}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {percent}%
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-brand-500 dark:text-slate-600" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* ---- Friendly AI tutor nudge ---- */}
          <Card className="animate-fade-up overflow-hidden rounded-3xl border-emerald-100 bg-emerald-50/50 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <CardBody className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <BotMascot className="h-12 w-12 shrink-0 text-slate-800 dark:text-slate-100" />
                <div>
                  <p className="font-display text-base font-bold text-slate-900 dark:text-slate-50">
                    Stuck on a tricky concept?
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                    Your AI tutor is ready to explain it step by step.
                  </p>
                </div>
              </div>
              <Link href="/chat" className="shrink-0">
                <Button variant="secondary" size="md">
                  <MessageSquare className="h-4 w-4" />
                  Ask AI Tutor
                </Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-7">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-3xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-3xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-3xl" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-3xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
      <Skeleton className="h-64 rounded-3xl" />
    </div>
  );
}
