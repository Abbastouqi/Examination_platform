"use client";

import { useState, useEffect } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { api, ApiError } from "@/lib/api";
import { cn, EXAM_TYPES, DIFFICULTIES } from "@/lib/utils";
import type { MCQ, MCQGenerateRequest } from "@/lib/types";
import {
  Card,
  CardBody,
  Button,
  Input,
  Select,
  Badge,
  ErrorAlert,
  EmptyState,
} from "@/components/ui";

type OptionKey = "A" | "B" | "C" | "D";
const OPTION_KEYS: OptionKey[] = ["A", "B", "C", "D"];

export default function McqPage() {
  const [testType, setTestType] = useState<string>(EXAM_TYPES[0]);
  const [subjectName, setSubjectName] = useState<string>("");
  const [topicName, setTopicName] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>(DIFFICULTIES[1]);
  const [count, setCount] = useState<number>(5);

  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [elapsed, setElapsed] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Tick an elapsed-seconds counter while a generation is in flight.
  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  // per-question UI state keyed by mcq id
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [explainLoading, setExplainLoading] = useState<Record<string, boolean>>(
    {}
  );

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      setError("Please enter a subject name.");
      return;
    }
    setLoading(true);
    setError(null);
    setMcqs([]);
    setRevealed({});
    setExplanations({});
    try {
      const body: MCQGenerateRequest = {
        test_type: testType,
        subject_name: subjectName.trim(),
        topic_name: topicName.trim() || undefined,
        difficulty,
        count,
      };
      const res = await api.post<MCQ[]>("/mcq/generate", body);
      setMcqs(Array.isArray(res) ? res : []);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to generate MCQs."
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleReveal = (id: string) => {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExplain = async (mcq: MCQ) => {
    setExplainLoading((prev) => ({ ...prev, [mcq.id]: true }));
    try {
      const res = await api.post<{ explanation?: string } | string>(
        "/mcq/explain",
        {
          question: mcq.question,
          options: mcq.options,
          correct: mcq.answer,
        }
      );
      const text =
        typeof res === "string"
          ? res
          : res?.explanation ?? JSON.stringify(res);
      setExplanations((prev) => ({ ...prev, [mcq.id]: text }));
      // make sure the answer area is visible
      setRevealed((prev) => ({ ...prev, [mcq.id]: true }));
    } catch (err) {
      setExplanations((prev) => ({
        ...prev,
        [mcq.id]:
          err instanceof ApiError
            ? err.message
            : "Failed to fetch explanation.",
      }));
    } finally {
      setExplainLoading((prev) => ({ ...prev, [mcq.id]: false }));
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="MCQ Generator"
        description="Generate practice multiple-choice questions on any topic."
      />

      <Card className="mb-6">
        <CardBody>
          <form
            onSubmit={handleGenerate}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <Select
              label="Exam type"
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
            >
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
            <Input
              label="Subject"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g. General Knowledge"
            />
            <Input
              label="Topic (optional)"
              value={topicName}
              onChange={(e) => setTopicName(e.target.value)}
              placeholder="e.g. Pakistan Affairs"
            />
            <Select
              label="Difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </Select>
            <Input
              label="Number of questions"
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) =>
                setCount(
                  Math.max(1, Math.min(20, Number(e.target.value) || 1))
                )
              }
            />
            <div className="flex items-end">
              <Button type="submit" className="w-full" loading={loading}>
                <Sparkles className="h-4 w-4" /> Generate
              </Button>
            </div>
          </form>
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Up to 20 questions per request. Usage counts toward your plan limit.
          </p>
        </CardBody>
      </Card>

      {error && (
        <div className="mb-6">
          <ErrorAlert message={error} />
        </div>
      )}

      {loading ? (
        <Card>
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400" />
            <p className="font-medium text-slate-800 dark:text-slate-100">
              Generating {count} question{count > 1 ? "s" : ""}…
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              The AI model writes each question fresh — this usually takes
              ~{Math.max(10, count * 11)}s. Please keep this tab open.
            </p>
            <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">
              {elapsed}s elapsed
            </p>
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-1000"
                style={{
                  width: `${Math.min(95, (elapsed / Math.max(10, count * 11)) * 100)}%`,
                }}
              />
            </div>
          </CardBody>
        </Card>
      ) : mcqs.length === 0 ? (
        !error && (
          <EmptyState
            icon={Sparkles}
            title="No questions yet"
            description="Fill out the form above and hit Generate to create practice MCQs."
          />
        )
      ) : (
        <div className="space-y-4">
          {mcqs.map((mcq, idx) => {
            const isRevealed = !!revealed[mcq.id];
            const answer = mcq.answer as OptionKey | undefined;
            const inlineExpl = explanations[mcq.id] || mcq.explanation;
            return (
              <Card key={mcq.id}>
                <CardBody>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="font-medium text-slate-900 dark:text-slate-100">
                      <span className="mr-2 font-semibold text-brand-500 dark:text-brand-400">
                        {idx + 1}.
                      </span>
                      {mcq.question}
                    </h3>
                    {mcq.difficulty && (
                      <Badge color="gray">{mcq.difficulty}</Badge>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {OPTION_KEYS.map((key) => {
                      const isCorrect = isRevealed && answer === key;
                      return (
                        <li
                          key={key}
                          className={cn(
                            "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                            isCorrect
                              ? "border-accent-300 bg-accent-50 text-accent-800 dark:border-accent-500/40 dark:bg-accent-500/10 dark:text-accent-200"
                              : "border-slate-200 text-slate-700 dark:border-ink-800 dark:text-slate-300"
                          )}
                        >
                          <span className="font-semibold">{key}.</span>
                          <span className="flex-1">{mcq.options?.[key]}</span>
                          {isCorrect && (
                            <Check className="h-4 w-4 shrink-0 text-accent-600 dark:text-accent-400" />
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleReveal(mcq.id)}
                    >
                      {isRevealed ? "Hide answer" : "Reveal answer"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={!!explainLoading[mcq.id]}
                      onClick={() => handleExplain(mcq)}
                    >
                      Explain
                    </Button>
                  </div>

                  {isRevealed && (
                    <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-ink-800 dark:bg-ink-950">
                      <p className="text-slate-700 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          Correct answer:
                        </span>{" "}
                        {answer ?? "—"}
                      </p>
                      {inlineExpl && (
                        <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            Explanation:
                          </span>{" "}
                          {inlineExpl}
                        </p>
                      )}
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
