"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  BarChart3,
  FileText,
  MessageSquare,
  Target,
  Lightbulb,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import {
  Button,
  Card,
  CardBody,
  Badge,
  ErrorAlert,
  LoadingBlock,
} from "@/components/ui";
import { ThemeToggle } from "@/components/theme";
import { Trophy, Squiggle } from "@/components/Illustrations";

/* ------------------------------------------------------------------ types */

type OptionKey = "A" | "B" | "C" | "D";

interface TrialQuestion {
  id: string | number;
  category: string;
  question: string;
  options: Record<OptionKey, string>;
  answer: OptionKey;
  explanation: string;
}

interface TrialResponse {
  count: number;
  questions: TrialQuestion[];
}

const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

const UNLOCKED_FEATURES = [
  { icon: FileText, label: "Unlimited mock tests & practice MCQs" },
  { icon: MessageSquare, label: "AI essay & précis evaluation" },
  { icon: BarChart3, label: "Performance analytics & weak-area detection" },
  { icon: Target, label: "Saved progress & personalized recommendations" },
];

/* ------------------------------------------------------------------ logo */

function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 shadow-glow">
        <GraduationCap className="h-5 w-5 text-white" />
      </span>
      <span className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        PrepGenius
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ page */

export default function TrialPage() {
  const [questions, setQuestions] = useState<TrialQuestion[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<OptionKey | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<TrialResponse>("/trial/questions");
        if (!active) return;
        const list = Array.isArray(data?.questions) ? data.questions : [];
        setQuestions(list);
        if (!list.length) {
          setError("No trial questions are available right now.");
        }
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Something went wrong loading the trial. Please try again."
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const total = questions?.length ?? 0;
  const question = questions?.[current];
  const answered = selected !== null;

  function handleSelect(key: OptionKey) {
    if (answered || !question) return;
    setSelected(key);
    if (key === question.answer) setScore((s) => s + 1);
  }

  function handleNext() {
    if (current + 1 >= total) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  }

  const progress = total ? ((current + (answered ? 1 : 0)) / total) * 100 : 0;

  return (
    <div className="doodle-bg min-h-screen text-slate-900 dark:text-slate-200">
      {/* ---------------------------------------------------------- header */}
      <header className="border-b border-slate-200/70 dark:border-ink-800">
        <nav className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="rounded-full">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="rounded-full">
                Sign up
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* ----------------------------------------------------------- body */}
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {/* intro */}
        <div className="mb-8 text-center animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
            <Sparkles className="h-3.5 w-3.5" /> Free trial
          </span>
          <h1 className="font-display mt-5 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Try PrepGenius free —{" "}
            <span className="relative inline-block">
              <span className="text-gradient">no signup needed</span>
              <Squiggle className="absolute -bottom-3 left-0 h-3 w-full text-orange-500" />
            </span>
          </h1>
          <p className="mt-6 text-slate-600 dark:text-slate-300">
            Answer a few exam-style questions and see how PrepGenius helps you
            learn from every answer.
          </p>
        </div>

        {loading && <LoadingBlock label="Loading your free questions…" />}

        {!loading && error && (
          <div className="mx-auto max-w-xl">
            <ErrorAlert message={error} />
          </div>
        )}

        {/* quiz */}
        {!loading && !error && question && !finished && (
          <div>
            {/* progress */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-600 dark:text-slate-300">
                <span>
                  Question {current + 1} of {total}
                </span>
                <span className="text-accent-600 dark:text-accent-300">
                  Score: {score}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-ink-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-600 to-accent-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <Card
              key={current}
              className="animate-fade-up rounded-3xl border-slate-200/80 shadow-soft"
            >
              <CardBody className="p-6 sm:p-8">
                <Badge color="brand">{question.category}</Badge>
                <h2 className="mt-4 text-lg font-semibold leading-snug text-slate-900 dark:text-white sm:text-xl">
                  {question.question}
                </h2>

                <div className="mt-6 space-y-3">
                  {OPTION_KEYS.map((key) => {
                    const isCorrect = key === question.answer;
                    const isChosen = key === selected;

                    let stateClasses =
                      "border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/60 dark:border-ink-800 dark:bg-ink-950 dark:hover:border-brand-500/40 dark:hover:bg-ink-800";
                    if (answered && isCorrect) {
                      stateClasses =
                        "border-accent-400 bg-accent-50 dark:border-accent-500/50 dark:bg-accent-500/10";
                    } else if (answered && isChosen && !isCorrect) {
                      stateClasses =
                        "border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-500/10";
                    } else if (answered) {
                      stateClasses =
                        "border-slate-200 bg-white opacity-70 dark:border-ink-800 dark:bg-ink-950";
                    }

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelect(key)}
                        disabled={answered}
                        className={
                          "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-all disabled:cursor-default sm:text-base " +
                          stateClasses
                        }
                      >
                        <span
                          className={
                            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold " +
                            (answered && isCorrect
                              ? "bg-accent-600 text-white"
                              : answered && isChosen && !isCorrect
                              ? "bg-red-600 text-white"
                              : "bg-slate-100 text-slate-700 dark:bg-ink-800 dark:text-slate-300")
                          }
                        >
                          {key}
                        </span>
                        <span className="flex-1 text-slate-800 dark:text-slate-200">
                          {question.options[key]}
                        </span>
                        {answered && isCorrect && (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-600 dark:text-accent-400" />
                        )}
                        {answered && isChosen && !isCorrect && (
                          <XCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {answered && (
                  <div className="mt-6 animate-fade-up rounded-2xl border border-brand-100 bg-brand-50/70 p-4 dark:border-brand-500/20 dark:bg-brand-500/10">
                    <div className="flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-200">
                      <Lightbulb className="h-4 w-4" />
                      {selected === question.answer
                        ? "Correct!"
                        : `Not quite — the answer is ${question.answer}.`}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {question.explanation}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button
                    size="lg"
                    className="rounded-full"
                    disabled={!answered}
                    onClick={handleNext}
                  >
                    {current + 1 >= total ? "See results" : "Next question"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* results + gate */}
        {!loading && !error && finished && (
          <div className="space-y-6">
            {/* results summary */}
            <Card className="animate-scale-in rounded-3xl border-slate-200/80 shadow-soft">
              <CardBody className="flex flex-col items-center p-8 text-center">
                <div className="animate-float">
                  <Trophy className="h-20 w-20 text-slate-900 dark:text-white" />
                </div>
                <h2 className="font-display mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
                  You scored {score} / {total}
                </h2>
                <p className="mt-2 max-w-md text-slate-600 dark:text-slate-300">
                  {score === total
                    ? "Perfect run! You're clearly exam-ready — imagine what you'll do with the full toolkit."
                    : score >= Math.ceil(total / 2)
                    ? "Great start! A little more focused practice and you'll be unstoppable."
                    : "Every expert started somewhere — with the right practice you'll climb fast."}
                </p>
              </CardBody>
            </Card>

            {/* gate / CTA */}
            <Card className="animate-fade-up overflow-hidden rounded-3xl border-brand-200 shadow-soft dark:border-brand-500/30">
              <CardBody className="p-8">
                <Badge color="accent">Free trial complete</Badge>
                <h3 className="font-display mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">
                  You&apos;ve completed your free trial!
                </h3>
                <p className="mt-3 text-slate-600 dark:text-slate-300">
                  Create a free account to unlock unlimited mock tests, AI essay
                  &amp; précis evaluation, performance analytics, saved progress
                  and personalized recommendations.
                </p>

                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {UNLOCKED_FEATURES.map((f) => (
                    <li
                      key={f.label}
                      className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </span>
                      <span>{f.label}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/signup" className="sm:flex-1">
                    <Button size="lg" className="w-full rounded-full">
                      Create free account
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login" className="sm:flex-1">
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-full rounded-full"
                    >
                      Log in
                    </Button>
                  </Link>
                </div>
              </CardBody>
            </Card>

            {/* persistent hint */}
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              <Link
                href="/signup"
                className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
              >
                Sign up to continue
              </Link>{" "}
              and keep your progress across every practice session.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
