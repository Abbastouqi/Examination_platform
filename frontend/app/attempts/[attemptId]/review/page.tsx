"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  BookOpen,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { ReviewItem, MCQOptions } from "@/lib/types";
import { cn } from "@/lib/utils";
import AppShell, { PageHeader } from "@/components/AppShell";
import {
  Button,
  Card,
  CardBody,
  Badge,
  LoadingBlock,
  EmptyState,
  ErrorAlert,
} from "@/components/ui";

type OptionKey = keyof MCQOptions; // "A" | "B" | "C" | "D"
const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

export default function ReviewPage({
  params,
}: {
  params: { attemptId: string };
}) {
  const { attemptId } = params;
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.get<ReviewItem[]>(
          `/tests/attempts/${attemptId}/review`
        );
        if (active) setItems(data);
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

  return (
    <AppShell>
      <PageHeader
        title="Answer Review"
        description="Review each question with the correct answer and explanation."
        action={
          <Link href={`/attempts/${attemptId}`}>
            <Button variant="outline">
              <ChevronLeft className="h-4 w-4" /> Back to result
            </Button>
          </Link>
        }
      />

      {loading ? (
        <LoadingBlock label="Loading review..." />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : !items || items.length === 0 ? (
        <EmptyState
          title="Nothing to review"
          description="There are no reviewable questions for this attempt."
        />
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => {
            const skipped = item.user_answer === null;
            return (
              <Card key={idx}>
                <CardBody>
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <p className="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-slate-100 px-2 text-sm font-bold text-slate-600 dark:bg-ink-800 dark:text-slate-300">
                      {idx + 1}
                    </p>
                    <Badge
                      color={
                        skipped ? "gray" : item.is_correct ? "green" : "red"
                      }
                    >
                      {skipped ? (
                        <>
                          <MinusCircle className="mr-1 h-3.5 w-3.5" /> Skipped
                        </>
                      ) : item.is_correct ? (
                        <>
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Correct
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3.5 w-3.5" /> Incorrect
                        </>
                      )}
                    </Badge>
                  </div>

                  <p className="text-base font-medium leading-relaxed text-slate-900 dark:text-slate-100">
                    {item.question}
                  </p>

                  <div className="mt-4 space-y-2.5">
                    {OPTION_KEYS.map((key) => {
                      const isCorrect = item.correct_answer === key;
                      const isUserWrong =
                        item.user_answer === key && !item.is_correct;
                      return (
                        <div
                          key={key}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
                            isCorrect
                              ? "border-green-300 bg-green-50 dark:border-green-500/40 dark:bg-green-500/10"
                              : isUserWrong
                              ? "border-red-300 bg-red-50 dark:border-red-500/40 dark:bg-red-500/10"
                              : "border-slate-200 bg-white dark:border-ink-800 dark:bg-ink-950"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                              isCorrect
                                ? "bg-green-600 text-white"
                                : isUserWrong
                                ? "bg-red-600 text-white"
                                : "bg-slate-100 text-slate-600 dark:bg-ink-800 dark:text-slate-300"
                            )}
                          >
                            {key}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200">
                            {item.options[key]}
                          </span>
                          {isCorrect && (
                            <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-300">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Correct answer
                            </span>
                          )}
                          {isUserWrong && (
                            <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-red-700 dark:text-red-300">
                              <XCircle className="h-3.5 w-3.5" />
                              Your answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {item.user_answer === null && (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <MinusCircle className="h-3.5 w-3.5" />
                      You skipped this question.
                    </p>
                  )}

                  {item.explanation && (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-ink-800 dark:bg-ink-950">
                      <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        <BookOpen className="h-3.5 w-3.5" />
                        Explanation
                      </p>
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                        {item.explanation}
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
