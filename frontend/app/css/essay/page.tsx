"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  PenLine,
  Sparkles,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  SpellCheck,
  Repeat,
  ThumbsUp,
  Wrench,
  ClipboardCheck,
} from "lucide-react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { api, ApiError } from "@/lib/api";
import {
  Card,
  CardBody,
  Button,
  Input,
  Textarea,
  Badge,
  ErrorAlert,
} from "@/components/ui";
import { Bulb } from "@/components/Illustrations";

// ---------------- types ----------------
type Band = "Excellent" | "Good" | "Average" | "Poor" | string;

interface Criterion {
  score: number;
  max: number;
  comment: string;
}
interface GrammarMistake {
  wrong: string;
  issue: string;
  correction: string;
}
interface SpellingMistake {
  wrong: string;
  correct: string;
}
interface Improvement {
  what: string;
  why: string;
  how: string;
  example: string;
}
interface EssayEvaluation {
  score: number;
  band: Band;
  word_count: number;
  readability: string;
  criteria: Record<string, Criterion>;
  grammar_mistakes: GrammarMistake[];
  spelling_mistakes: SpellingMistake[];
  repetition: string[];
  strengths: string[];
  improvements: Improvement[];
  verdict: string;
}
interface EvaluateResponse {
  submission_id: string;
  evaluation: EssayEvaluation;
}

// ---------------- helpers ----------------
function bandColor(
  band: Band
): "green" | "brand" | "amber" | "red" | "gray" {
  switch (band) {
    case "Excellent":
      return "green";
    case "Good":
      return "brand";
    case "Average":
      return "amber";
    case "Poor":
      return "red";
    default:
      return "gray";
  }
}

function humanizeKey(key: string): string {
  const s = key.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function scoreRingColor(score: number): string {
  if (score >= 75) return "text-accent-500";
  if (score >= 60) return "text-brand-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

export default function EssayPage() {
  // topic state
  const [theme, setTheme] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");

  // essay state
  const [essay, setEssay] = useState("");

  // evaluation state
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EssayEvaluation | null>(null);

  const wordCount = useMemo(
    () => essay.trim().split(/\s+/).filter(Boolean).length,
    [essay]
  );

  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const suggestTopics = async () => {
    setTopicsLoading(true);
    setTopicsError(null);
    try {
      const qs = theme.trim()
        ? `?theme=${encodeURIComponent(theme.trim())}`
        : "";
      const res = await api.get<{ topics: string[] }>(`/css/essay/topics${qs}`);
      setTopics(Array.isArray(res?.topics) ? res.topics : []);
    } catch (err) {
      setTopicsError(
        err instanceof ApiError ? err.message : "Failed to load topics."
      );
    } finally {
      setTopicsLoading(false);
    }
  };

  const evaluate = async () => {
    if (!topic.trim()) {
      setError("Please choose or enter a topic first.");
      return;
    }
    if (wordCount < 50) {
      setError("Please write at least 50 words before evaluating.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<EvaluateResponse>("/css/essay/evaluate", {
        topic: topic.trim(),
        essay,
      });
      setResult(res?.evaluation ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to evaluate the essay."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Essay Evaluation"
        description="Write a CSS-style essay and get a detailed, examiner-style grade."
        action={
          <Link href="/css">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" /> Back to CSS
            </Button>
          </Link>
        }
      />

      {/* ---------- Topic picker ---------- */}
      <Card className="mb-6 rounded-3xl">
        <CardBody>
          <div className="mb-3 flex items-center gap-2">
            <Bulb className="h-6 w-6 text-slate-900 dark:text-slate-100" />
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Choose a topic
              <span className="squiggle ml-1" />
            </h3>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Theme (optional)"
                value={theme}
                placeholder="e.g. Environment, Governance, Technology"
                onChange={(e) => setTheme(e.target.value)}
              />
            </div>
            <Button variant="secondary" onClick={suggestTopics} loading={topicsLoading}>
              <Sparkles className="h-4 w-4" /> Suggest topics
            </Button>
          </div>

          {topicsError && (
            <div className="mt-3">
              <ErrorAlert message={topicsError} />
            </div>
          )}

          {topics.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {topics.map((t) => {
                const active = topic === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTopic(t)}
                    className={
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
                      (active
                        ? "border-brand-500 bg-brand-500 text-white shadow-sm"
                        : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20")
                    }
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4">
            <Input
              label="Or type your own topic"
              value={topic}
              placeholder="Enter an essay topic"
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          {topic.trim() && (
            <div className="mt-4 rounded-2xl bg-amber-50 p-3 dark:bg-ink-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Selected topic
              </p>
              <p className="mt-0.5 text-base font-semibold text-slate-900 dark:text-slate-100">
                {topic}
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* ---------- Essay editor ---------- */}
      <Card className="mb-6 rounded-3xl">
        <CardBody>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Your essay
            </h3>
            <span
              className={
                "text-sm font-medium " +
                (wordCount < 50
                  ? "text-slate-400 dark:text-slate-500"
                  : wordCount >= 2500 && wordCount <= 3000
                  ? "text-accent-600 dark:text-accent-400"
                  : "text-brand-600 dark:text-brand-300")
              }
            >
              {wordCount} words
            </span>
          </div>
          <Textarea
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
            rows={16}
            placeholder="Write your essay here…"
            className="resize-y font-sans leading-relaxed"
          />
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            CSS essays typically run 2,500–3,000 words. This is a guide, not a
            hard limit — a minimum of 50 words is needed to evaluate.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={evaluate} loading={loading} disabled={loading}>
              <PenLine className="h-4 w-4" /> Evaluate essay
            </Button>
            {!loading && wordCount > 0 && wordCount < 50 && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {50 - wordCount} more words to go
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {error && (
        <div className="mb-6">
          <ErrorAlert message={error} />
        </div>
      )}

      {/* ---------- Progress ---------- */}
      {loading && (
        <Card className="mb-6 rounded-3xl">
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 className="h-9 w-9 animate-spin text-brand-600 dark:text-brand-400" />
            <p className="font-medium text-slate-800 dark:text-slate-100">
              Our AI examiner is grading your essay against CSS standards…
            </p>
            <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
              This can take anywhere from 40 seconds to a few minutes. Please
              keep this tab open — we&apos;re reading every paragraph carefully.
            </p>
            <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
              {elapsed}s elapsed
            </p>
            <div className="h-1.5 w-56 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-1000"
                style={{ width: `${Math.min(95, (elapsed / 180) * 100)}%` }}
              />
            </div>
          </CardBody>
        </Card>
      )}

      {/* ---------- Report ---------- */}
      {!loading && result && <EssayReport result={result} />}
    </AppShell>
  );
}

// ================= Report =================
function EssayReport({ result }: { result: EssayEvaluation }) {
  const {
    score,
    band,
    word_count,
    readability,
    criteria,
    grammar_mistakes,
    spelling_mistakes,
    repetition,
    strengths,
    improvements,
    verdict,
  } = result;

  const criteriaEntries = Object.entries(criteria || {});

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Score header */}
      <Card className="overflow-hidden rounded-3xl">
        <CardBody className="doodle-bg flex flex-col items-center gap-6 sm:flex-row">
          <ScoreRing score={score} max={100} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                Evaluation report
              </h3>
              <Badge color={bandColor(band)}>{band}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Your essay scored{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {score}/100
              </span>
              .
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-3 sm:justify-start">
              <MiniStat label="Word count" value={word_count} />
              <MiniStat label="Readability" value={readability || "—"} />
              <MiniStat label="Criteria" value={criteriaEntries.length} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Criteria breakdown */}
      {criteriaEntries.length > 0 && (
        <Section
          icon={ClipboardCheck}
          title="Criteria breakdown"
          tint="brand"
        >
          <div className="space-y-4">
            {criteriaEntries.map(([key, c]) => {
              const ratio = c.max ? Math.min(c.score / c.max, 1) : 0;
              return (
                <div key={key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {humanizeKey(key)}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {c.score}/{c.max}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
                    <div
                      className={
                        "h-full rounded-full transition-all " +
                        (ratio >= 0.75
                          ? "bg-accent-500"
                          : ratio >= 0.5
                          ? "bg-brand-500"
                          : ratio >= 0.3
                          ? "bg-amber-500"
                          : "bg-red-500")
                      }
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </div>
                  {c.comment && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {c.comment}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Strengths */}
      <Section icon={ThumbsUp} title="Strengths" tint="accent">
        {strengths?.length ? (
          <ul className="space-y-2">
            {strengths.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyLine text="No specific strengths were highlighted." />
        )}
      </Section>

      {/* Improvements */}
      <Section icon={Wrench} title="How to improve" tint="brand">
        {improvements?.length ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {improvements.map((imp, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-violet-50/60 p-4 dark:border-ink-800 dark:bg-ink-950"
              >
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {imp.what}
                </p>
                {imp.why && (
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Why:
                    </span>{" "}
                    {imp.why}
                  </p>
                )}
                {imp.how && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      How:
                    </span>{" "}
                    {imp.how}
                  </p>
                )}
                {imp.example && (
                  <p className="mt-2 rounded-lg bg-white p-2 text-sm italic text-slate-600 dark:bg-ink-900 dark:text-slate-400">
                    “{imp.example}”
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyLine text="No improvement notes — nice work!" />
        )}
      </Section>

      {/* Grammar mistakes */}
      <Section icon={AlertTriangle} title="Grammar mistakes" tint="amber">
        {grammar_mistakes?.length ? (
          <div className="space-y-2">
            {grammar_mistakes.map((g, i) => (
              <div
                key={i}
                className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10"
              >
                <p className="text-slate-800 dark:text-slate-200">
                  <span className="font-semibold text-red-600 line-through dark:text-red-400">
                    {g.wrong}
                  </span>{" "}
                  →{" "}
                  <span className="font-semibold text-accent-700 dark:text-accent-300">
                    {g.correction}
                  </span>
                </p>
                {g.issue && (
                  <p className="mt-1 text-slate-600 dark:text-slate-400">
                    {g.issue}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyLine text="No grammar mistakes detected." />
        )}
      </Section>

      {/* Spelling mistakes */}
      <Section icon={SpellCheck} title="Spelling mistakes" tint="amber">
        {spelling_mistakes?.length ? (
          <div className="flex flex-wrap gap-2">
            {spelling_mistakes.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm dark:border-ink-800 dark:bg-ink-950"
              >
                <span className="text-red-600 line-through dark:text-red-400">
                  {s.wrong}
                </span>
                <span className="text-slate-400">→</span>
                <span className="font-medium text-accent-700 dark:text-accent-300">
                  {s.correct}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <EmptyLine text="No spelling mistakes detected." />
        )}
      </Section>

      {/* Repetition */}
      <Section icon={Repeat} title="Repetition" tint="brand">
        {repetition?.length ? (
          <div className="flex flex-wrap gap-2">
            {repetition.map((r, i) => (
              <Badge key={i} color="gray">
                {r}
              </Badge>
            ))}
          </div>
        ) : (
          <EmptyLine text="No noticeable repetition." />
        )}
      </Section>

      {/* Verdict */}
      <Card className="overflow-hidden rounded-3xl border-2 border-brand-200 dark:border-brand-500/30">
        <CardBody className="bg-gradient-to-br from-brand-50 to-accent-50 dark:from-brand-500/10 dark:to-accent-500/10">
          <div className="mb-2 flex items-center gap-2">
            <Bulb className="h-6 w-6 text-slate-900 dark:text-slate-100" />
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Examiner&apos;s verdict
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {verdict || "No verdict provided."}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

// ================= small pieces =================
function ScoreRing({ score, max }: { score: number; max: number }) {
  const ratio = max ? Math.min(Math.max(score / max, 0), 1) : 0;
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ratio);
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="12"
          className="stroke-slate-200 dark:stroke-ink-800"
        />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={scoreRingColor(score)}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold text-slate-900 dark:text-slate-100">
          {score}
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          / {max}
        </span>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-center dark:border-ink-800 dark:bg-ink-900">
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {value}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500">{label}</p>
    </div>
  );
}

const sectionTints: Record<string, string> = {
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  accent:
    "bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

function Section({
  icon: Icon,
  title,
  tint = "brand",
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tint?: "brand" | "accent" | "amber";
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-3xl">
      <CardBody>
        <div className="mb-3 flex items-center gap-2">
          <div className={"rounded-xl p-2 " + sectionTints[tint]}>
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
        </div>
        {children}
      </CardBody>
    </Card>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="text-sm italic text-slate-400 dark:text-slate-500">{text}</p>
  );
}
