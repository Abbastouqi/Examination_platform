"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Flag,
  ChevronLeft,
  ChevronRight,
  SkipForward,
  Clock,
  ListChecks,
  CheckCircle2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type {
  StartTestResponse,
  TestQuestion,
  Attempt,
  Test,
  TestResult,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import AppShell, { PageHeader } from "@/components/AppShell";
import {
  Button,
  Card,
  CardBody,
  LoadingBlock,
  ErrorAlert,
  Modal,
  Badge,
} from "@/components/ui";

type AnswerKey = "A" | "B" | "C" | "D";
const OPTION_KEYS: AnswerKey[] = ["A", "B", "C", "D"];

export default function TakeTestPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const testId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerKey>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);

  const doSubmit = useCallback(async () => {
    if (submittedRef.current || !attempt) return;
    submittedRef.current = true;
    setSubmitting(true);
    setError(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    try {
      await api.post<TestResult>(
        `/tests/attempts/${attempt.id}/submit`,
        { answers }
      );
      router.push(`/attempts/${attempt.id}`);
    } catch (e) {
      submittedRef.current = false;
      setSubmitting(false);
      setConfirmOpen(false);
      setError(e instanceof ApiError ? e.message : "Something went wrong");
    }
  }, [attempt, answers, router]);

  // Load: start the attempt and fetch test (for duration) in parallel.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [start, test] = await Promise.all([
          api.post<StartTestResponse>(`/tests/${testId}/start`),
          api.get<Test>(`/tests/${testId}`).catch(() => null),
        ]);
        if (!active) return;
        setAttempt(start.attempt);
        setQuestions(start.questions || []);
        const minutes = test?.duration_minutes;
        if (minutes && minutes > 0) {
          setSecondsLeft(minutes * 60);
        }
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
  }, [testId]);

  // Countdown timer; auto-submit at 0.
  useEffect(() => {
    if (secondsLeft === null) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          // auto-submit when time runs out
          void doSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Only (re)start when the timer is first set; doSubmit is stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft !== null]);

  // Clear on unmount.
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function selectAnswer(qid: string, key: AnswerKey) {
    setAnswers((prev) => ({ ...prev, [qid]: key }));
  }

  function toggleMark(qid: string) {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(qid)) next.delete(qid);
      else next.add(qid);
      return next;
    });
  }

  function goPrev() {
    setCurrent((c) => Math.max(0, c - 1));
  }
  function goNext() {
    setCurrent((c) => Math.min(questions.length - 1, c + 1));
  }

  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
  const ss = secondsLeft !== null ? secondsLeft % 60 : 0;
  const timerDanger = secondsLeft !== null && secondsLeft < 60;
  const timerWarn = secondsLeft !== null && secondsLeft < 120 && !timerDanger;
  const answeredCount = Object.keys(answers).length;
  const progressPct =
    questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <AppShell>
        <LoadingBlock label="Starting your test..." />
      </AppShell>
    );
  }

  if (error && questions.length === 0) {
    return (
      <AppShell>
        <PageHeader title="Mock Test" />
        <ErrorAlert message={error} />
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push("/tests")}>
            Back to tests
          </Button>
        </div>
      </AppShell>
    );
  }

  const q = questions[current];

  return (
    <AppShell>
      {/* Sticky exam header */}
      <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur dark:border-ink-800 dark:bg-ink-900/85 lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              <ListChecks className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-300" />
              Mock Test
            </h1>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {answeredCount} of {questions.length} answered
            </p>
          </div>
          {secondsLeft !== null && (
            <div
              className={cn(
                "inline-flex items-center gap-2 self-start rounded-xl px-4 py-2 text-lg font-bold tabular-nums ring-1 transition-colors sm:self-auto",
                timerDanger
                  ? "animate-pulse bg-red-50 text-red-600 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30"
                  : timerWarn
                  ? "bg-gold-400/15 text-gold-600 ring-gold-400/40 dark:text-gold-400"
                  : "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/30"
              )}
              role="timer"
              aria-live="polite"
            >
              <Clock className="h-5 w-5" />
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-accent-500 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <ErrorAlert message={error} />

      <div className="mt-4 grid gap-6 lg:grid-cols-4">
        {/* Navigator */}
        <div className="lg:col-span-1 lg:order-2">
          <Card className="lg:sticky lg:top-44">
            <CardBody>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Questions
                </p>
                <Badge color="brand">
                  {answeredCount}/{questions.length}
                </Badge>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((item, i) => {
                  const isAnswered = answers[item.id] !== undefined;
                  const isCurrent = i === current;
                  const isMarked = marked.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrent(i)}
                      aria-current={isCurrent ? "true" : undefined}
                      className={cn(
                        "relative flex h-9 w-full items-center justify-center rounded-lg text-sm font-semibold transition",
                        isAnswered
                          ? "bg-brand-600 text-white hover:bg-brand-700"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-ink-800 dark:bg-ink-950 dark:text-slate-300 dark:hover:bg-ink-800",
                        isCurrent &&
                          "ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-ink-900"
                      )}
                    >
                      {i + 1}
                      {isMarked && (
                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-gold-500 ring-2 ring-white dark:ring-ink-900" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                <p className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded bg-brand-600" />
                  Answered
                </p>
                <p className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded border-2 border-brand-500 bg-white dark:bg-ink-950" />
                  Current
                </p>
                <p className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full bg-gold-500" />
                  Marked for review
                </p>
                <p className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded border border-slate-300 bg-white dark:border-ink-800 dark:bg-ink-950" />
                  Unanswered
                </p>
              </div>
              <Button
                className="mt-4 w-full"
                variant="secondary"
                onClick={() => setConfirmOpen(true)}
              >
                <CheckCircle2 className="h-4 w-4" /> Submit Test
              </Button>
            </CardBody>
          </Card>
        </div>

        {/* Question view */}
        <div className="lg:col-span-3 lg:order-1">
          <Card>
            <CardBody>
              {q ? (
                <>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <p className="text-sm font-semibold text-brand-600 dark:text-brand-300">
                      Question {current + 1}
                      <span className="font-medium text-slate-400 dark:text-slate-500">
                        {" "}
                        / {questions.length}
                      </span>
                    </p>
                    <button
                      onClick={() => toggleMark(q.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                        marked.has(q.id)
                          ? "bg-gold-400/15 text-gold-600 ring-1 ring-gold-400/40 dark:text-gold-400"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-800"
                      )}
                    >
                      <Flag
                        className={cn(
                          "h-3.5 w-3.5",
                          marked.has(q.id) && "fill-current"
                        )}
                      />
                      {marked.has(q.id) ? "Marked" : "Mark for review"}
                    </button>
                  </div>

                  <p className="text-lg font-medium leading-relaxed text-slate-900 dark:text-slate-100">
                    {q.question}
                  </p>

                  <div className="mt-6 space-y-3">
                    {OPTION_KEYS.map((key) => {
                      const selected = answers[q.id] === key;
                      return (
                        <button
                          key={key}
                          onClick={() => selectAnswer(q.id, key)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition",
                            selected
                              ? "border-brand-500 bg-brand-50 ring-1 ring-brand-300 dark:border-brand-500/50 dark:bg-brand-500/10 dark:ring-brand-500/40"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-ink-800 dark:bg-ink-950 dark:hover:border-ink-800/60 dark:hover:bg-ink-800/60"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                              selected
                                ? "bg-brand-600 text-white"
                                : "bg-slate-100 text-slate-600 dark:bg-ink-800 dark:text-slate-300"
                            )}
                          >
                            {key}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200">
                            {q.options[key]}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-7 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-5 dark:border-ink-800">
                    <Button
                      variant="outline"
                      onClick={goPrev}
                      disabled={current === 0}
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        onClick={goNext}
                        disabled={current === questions.length - 1}
                      >
                        <SkipForward className="h-4 w-4" /> Skip
                      </Button>
                      <Button
                        onClick={goNext}
                        disabled={current === questions.length - 1}
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No questions available.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Submit test?"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="secondary" loading={submitting} onClick={doSubmit}>
              Submit
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          You have answered {answeredCount} of {questions.length} questions.
          {answeredCount < questions.length &&
            " Unanswered questions will be marked as skipped."}{" "}
          Are you sure you want to submit?
        </p>
      </Modal>
    </AppShell>
  );
}
