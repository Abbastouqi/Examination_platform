"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Sparkles,
  Loader2,
  ArrowLeft,
  AlertTriangle,
  Wrench,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
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
import { BooksStack } from "@/components/Illustrations";

// ---------------- types ----------------
type Band = "Excellent" | "Good" | "Average" | "Poor" | string;

interface GrammarMistake {
  wrong: string;
  issue: string;
  correction: string;
}
interface Improvement {
  what: string;
  why: string;
  how: string;
  example: string;
}
interface PrecisEvaluation {
  score: number;
  precis_score: number;
  title_score: number;
  band: Band;
  original_words: number;
  precis_words: number;
  ideal_words: number;
  length_verdict: string;
  title_appropriate: boolean;
  title_comment: string;
  captures_meaning: string;
  own_words: string;
  third_person: boolean;
  conciseness: string;
  clarity: string;
  grammar_mistakes: GrammarMistake[];
  improvements: Improvement[];
  model_precis: string;
  verdict: string;
}
interface EvaluateResponse {
  submission_id: string;
  evaluation: PrecisEvaluation;
}
interface PassageResponse {
  passage: string;
  word_count: number;
}

function bandColor(band: Band): "green" | "brand" | "amber" | "red" | "gray" {
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

export default function PrecisPage() {
  // passage state
  const [theme, setTheme] = useState("");
  const [passage, setPassage] = useState("");
  const [passageWords, setPassageWords] = useState<number | null>(null);
  const [passageLoading, setPassageLoading] = useState(false);
  const [passageError, setPassageError] = useState<string | null>(null);

  // precis state
  const [title, setTitle] = useState("");
  const [precis, setPrecis] = useState("");

  // evaluation state
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PrecisEvaluation | null>(null);

  const passageWordCount = useMemo(
    () => passage.trim().split(/\s+/).filter(Boolean).length,
    [passage]
  );
  const precisWordCount = useMemo(
    () => precis.trim().split(/\s+/).filter(Boolean).length,
    [precis]
  );
  const idealWords = Math.round(passageWordCount / 3);

  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  const getPassage = async () => {
    setPassageLoading(true);
    setPassageError(null);
    try {
      const qs = theme.trim()
        ? `?theme=${encodeURIComponent(theme.trim())}`
        : "";
      const res = await api.get<PassageResponse>(`/css/precis/passage${qs}`);
      setPassage(res?.passage ?? "");
      setPassageWords(typeof res?.word_count === "number" ? res.word_count : null);
    } catch (err) {
      setPassageError(
        err instanceof ApiError ? err.message : "Failed to load a passage."
      );
    } finally {
      setPassageLoading(false);
    }
  };

  const evaluate = async () => {
    if (!passage.trim()) {
      setError("Please load or paste a passage first.");
      return;
    }
    if (precisWordCount < 20) {
      setError("Please write at least 20 words of précis before evaluating.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<EvaluateResponse>("/css/precis/evaluate", {
        passage,
        title: title.trim(),
        precis,
      });
      setResult(res?.evaluation ?? null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to evaluate the précis."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Précis Evaluation"
        description="Condense a passage into a tight précis and get it graded."
        action={
          <Link href="/css">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" /> Back to CSS
            </Button>
          </Link>
        }
      />

      {/* ---------- Passage ---------- */}
      <Card className="mb-6 rounded-3xl">
        <CardBody>
          <div className="mb-3 flex items-center gap-2">
            <BooksStack className="h-7 w-7 text-slate-900 dark:text-slate-100" />
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Passage
              <span className="squiggle ml-1" />
            </h3>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Theme (optional)"
                value={theme}
                placeholder="e.g. Society, Science, Ethics"
                onChange={(e) => setTheme(e.target.value)}
              />
            </div>
            <Button variant="secondary" onClick={getPassage} loading={passageLoading}>
              <Sparkles className="h-4 w-4" /> Get a passage
            </Button>
          </div>

          {passageError && (
            <div className="mt-3">
              <ErrorAlert message={passageError} />
            </div>
          )}

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Passage text
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {passageWordCount} words
                {passageWordCount > 0 && (
                  <>
                    {" "}
                    · ideal précis ≈{" "}
                    <span className="font-semibold text-brand-600 dark:text-brand-300">
                      {idealWords} words
                    </span>
                  </>
                )}
              </span>
            </div>
            <Textarea
              value={passage}
              onChange={(e) => {
                setPassage(e.target.value);
                setPassageWords(null); // user-edited, recompute from live count
              }}
              rows={9}
              placeholder="Click “Get a passage” or paste your own passage here…"
              className="resize-y leading-relaxed"
            />
            {passageWords !== null && (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Server reported {passageWords} words for this passage.
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ---------- Précis editor ---------- */}
      <Card className="mb-6 rounded-3xl">
        <CardBody>
          <div className="mb-3">
            <Input
              label="Title"
              value={title}
              placeholder="Give your précis a suitable title"
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Your précis
            </h3>
            <span
              className={
                "text-sm font-medium " +
                (precisWordCount === 0
                  ? "text-slate-400 dark:text-slate-500"
                  : idealWords &&
                    precisWordCount <= idealWords + Math.ceil(idealWords * 0.15) &&
                    precisWordCount >= idealWords - Math.ceil(idealWords * 0.15)
                  ? "text-accent-600 dark:text-accent-400"
                  : "text-brand-600 dark:text-brand-300")
              }
            >
              {precisWordCount} words
              {idealWords > 0 && ` / ~${idealWords}`}
            </span>
          </div>
          <Textarea
            value={precis}
            onChange={(e) => setPrecis(e.target.value)}
            rows={8}
            placeholder="Write your précis here — aim for about one-third of the passage…"
            className="resize-y leading-relaxed"
          />
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            A précis should be roughly one-third of the original, in your own
            words and in the third person.
          </p>

          <div className="mt-4">
            <Button onClick={evaluate} loading={loading} disabled={loading}>
              <FileText className="h-4 w-4" /> Evaluate précis
            </Button>
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
              Our AI examiner is grading your précis against CSS standards…
            </p>
            <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
              This can take anywhere from 40 seconds to a few minutes. Please
              keep this tab open.
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
      {!loading && result && <PrecisReport result={result} />}
    </AppShell>
  );
}

// ================= Report =================
function PrecisReport({ result }: { result: PrecisEvaluation }) {
  const {
    score,
    precis_score,
    title_score,
    band,
    original_words,
    precis_words,
    ideal_words,
    length_verdict,
    title_appropriate,
    title_comment,
    captures_meaning,
    own_words,
    third_person,
    conciseness,
    clarity,
    grammar_mistakes,
    improvements,
    model_precis,
    verdict,
  } = result;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Score header */}
      <Card className="overflow-hidden rounded-3xl">
        <CardBody className="doodle-bg flex flex-col items-center gap-6 sm:flex-row">
          <ScoreRing score={score} max={20} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                Evaluation report
              </h3>
              <Badge color={bandColor(band)}>{band}</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Overall{" "}
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {score}/20
              </span>
              .
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-3 sm:justify-start">
              <MiniStat label="Précis" value={`${precis_score}/15`} />
              <MiniStat label="Title" value={`${title_score}/5`} />
              <MiniStat label="Original" value={`${original_words}w`} />
              <MiniStat label="Your précis" value={`${precis_words}w`} />
              <MiniStat label="Ideal" value={`~${ideal_words}w`} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Length + title */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Section icon={ClipboardCheck} title="Length" tint="brand">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {length_verdict || "—"}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {precis_words} words vs ideal ≈ {ideal_words} words (of{" "}
            {original_words} original).
          </p>
        </Section>

        <Section icon={ClipboardCheck} title="Title" tint="accent">
          <div className="mb-2">
            <BoolPill ok={title_appropriate} label="Appropriate title" />
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {title_comment || "—"}
          </p>
        </Section>
      </div>

      {/* Qualitative assessment */}
      <Section icon={ClipboardCheck} title="Assessment" tint="brand">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Assess label="Captures meaning" value={captures_meaning} />
          <Assess label="Own words" value={own_words} />
          <Assess label="Conciseness" value={conciseness} />
          <Assess label="Clarity" value={clarity} />
        </div>
        <div className="mt-3">
          <BoolPill ok={third_person} label="Written in the third person" />
        </div>
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

      {/* Model précis */}
      {model_precis && (
        <Card className="overflow-hidden rounded-3xl border-2 border-accent-200 dark:border-accent-500/30">
          <CardBody className="bg-gradient-to-br from-accent-50 to-brand-50 dark:from-accent-500/10 dark:to-brand-500/10">
            <div className="mb-2 flex items-center gap-2">
              <BooksStack className="h-6 w-6 text-slate-900 dark:text-slate-100" />
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Model précis
              </h3>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              {model_precis}
            </p>
          </CardBody>
        </Card>
      )}

      {/* Verdict */}
      <Card className="overflow-hidden rounded-3xl border-2 border-brand-200 dark:border-brand-500/30">
        <CardBody className="bg-gradient-to-br from-brand-50 to-accent-50 dark:from-brand-500/10 dark:to-accent-500/10">
          <h3 className="mb-2 font-display text-base font-bold text-slate-900 dark:text-slate-100">
            Examiner&apos;s verdict
          </h3>
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
  const color =
    ratio >= 0.75
      ? "text-accent-500"
      : ratio >= 0.6
      ? "text-brand-500"
      : ratio >= 0.4
      ? "text-amber-500"
      : "text-red-500";
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
          className={color}
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

function Assess({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-ink-800 dark:bg-ink-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
        {value || "—"}
      </p>
    </div>
  );
}

function BoolPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset " +
        (ok
          ? "bg-accent-50 text-accent-700 ring-accent-200 dark:bg-accent-500/15 dark:text-accent-300 dark:ring-accent-500/30"
          : "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30")
      }
    >
      {ok ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      {label}
    </span>
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
