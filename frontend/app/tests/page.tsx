"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Clock,
  ListChecks,
  Rocket,
  Sparkles,
  Zap,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Test, CreateTestRequest, TestMode } from "@/lib/types";
import { EXAM_TYPES, DIFFICULTIES, formatDate, cn } from "@/lib/utils";
import AppShell, { PageHeader } from "@/components/AppShell";
import { TargetDoodle } from "@/components/Illustrations";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Select,
  Badge,
  LoadingBlock,
  EmptyState,
  ErrorAlert,
  SuccessAlert,
} from "@/components/ui";

const MODES: TestMode[] = ["full", "subject", "topic"];

// Exam types that support the category-based mock test builder.
const MOCK_EXAM_TYPES = ["FPSC", "NTS"] as const;
type MockExamType = (typeof MOCK_EXAM_TYPES)[number];

interface CategoryInfo {
  category: string;
  count: number;
}

// Pastel chip palette cycled by index for the multi-select category chips.
const CHIP_PALETTE = [
  {
    on: "bg-violet-100 text-violet-800 ring-violet-300 dark:bg-violet-500/20 dark:text-violet-200 dark:ring-violet-500/40",
    count: "text-violet-500 dark:text-violet-300/80",
  },
  {
    on: "bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:ring-emerald-500/40",
    count: "text-emerald-500 dark:text-emerald-300/80",
  },
  {
    on: "bg-amber-100 text-amber-800 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:ring-amber-500/40",
    count: "text-amber-500 dark:text-amber-300/80",
  },
  {
    on: "bg-sky-100 text-sky-800 ring-sky-300 dark:bg-sky-500/20 dark:text-sky-200 dark:ring-sky-500/40",
    count: "text-sky-500 dark:text-sky-300/80",
  },
  {
    on: "bg-rose-100 text-rose-800 ring-rose-300 dark:bg-rose-500/20 dark:text-rose-200 dark:ring-rose-500/40",
    count: "text-rose-500 dark:text-rose-300/80",
  },
] as const;

const CHIP_OFF =
  "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50 dark:bg-ink-950 dark:text-slate-400 dark:ring-ink-800 dark:hover:bg-ink-800";

function splitIds(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function TestsPage() {
  const router = useRouter();

  // list state
  const [tests, setTests] = useState<Test[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // --- mock test builder state ---
  const [mockType, setMockType] = useState<MockExamType>("FPSC");
  const [categories, setCategories] = useState<CategoryInfo[] | null>(null);
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [catsLoading, setCatsLoading] = useState(false);
  const [catsError, setCatsError] = useState<string | null>(null);
  const [mockNumQuestions, setMockNumQuestions] = useState<number>(20);
  const [mockDuration, setMockDuration] = useState<number>(30);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [mockStarting, setMockStarting] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);

  // form state
  const [title, setTitle] = useState("");
  const [testType, setTestType] = useState<string>(EXAM_TYPES[0]);
  const [mode, setMode] = useState<TestMode>("full");
  const [subjectIds, setSubjectIds] = useState("");
  const [topicIds, setTopicIds] = useState("");
  const [difficulty, setDifficulty] = useState<string>(DIFFICULTIES[1]);
  const [numQuestions, setNumQuestions] = useState<number>(20);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadTests() {
    setLoading(true);
    setListError(null);
    try {
      const data = await api.get<Test[]>("/tests");
      setTests(data);
    } catch (e) {
      setListError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTests();
  }, []);

  // Fetch categories whenever the mock exam type changes.
  useEffect(() => {
    let active = true;
    (async () => {
      setCatsLoading(true);
      setCatsError(null);
      setCategories(null);
      try {
        const data = await api.get<CategoryInfo[]>(
          `/tests/categories?test_type=${mockType}`
        );
        if (!active) return;
        setCategories(data);
        // Default: all selected.
        setSelectedCats(new Set(data.map((c) => c.category)));
      } catch (e) {
        if (active)
          setCatsError(
            e instanceof ApiError ? e.message : "Failed to load categories"
          );
      } finally {
        if (active) setCatsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [mockType]);

  function toggleCategory(cat: string) {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  async function handleStartMock(e: React.FormEvent) {
    e.preventDefault();
    setMockError(null);
    if (selectedCats.size === 0) {
      setMockError("Select at least one category.");
      return;
    }
    setMockStarting(true);
    try {
      const test = await api.post<Test>("/tests/category", {
        test_type: mockType,
        categories: Array.from(selectedCats),
        num_questions: mockNumQuestions,
        duration_minutes: mockDuration,
        negative_marking: negativeMarking,
        negative_mark: negativeMarking ? 0.25 : 0,
      });
      router.push(`/tests/${test.id}/take`);
    } catch (err) {
      setMockError(
        err instanceof ApiError ? err.message : "Could not start the mock test"
      );
      setMockStarting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setSuccess(null);
    const body: CreateTestRequest = {
      title: title.trim(),
      test_type: testType,
      mode,
      subject_ids: splitIds(subjectIds),
      topic_ids: splitIds(topicIds),
      difficulty,
      num_questions: numQuestions,
      duration_minutes: durationMinutes,
    };
    try {
      const created = await api.post<Test>("/tests", body);
      setSuccess(`Created “${created.title}”.`);
      setTitle("");
      await loadTests();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Mock Tests"
        description="Create a timed mock test and start practising."
      />

      {/* FPSC / NTS Mock Test builder */}
      <Card className="mb-6 overflow-hidden">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-100/70 via-transparent to-emerald-100/60 dark:from-brand-500/10 dark:to-accent-500/10" />
          <CardBody className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 p-2.5 shadow-glow">
                  <Rocket className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
                    FPSC / NTS Mock Test
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Pick categories and jump straight into a timed test.
                  </p>
                </div>
              </div>
              <TargetDoodle className="hidden h-14 w-14 text-slate-900 dark:text-slate-100 sm:block" />
            </div>

            <form onSubmit={handleStartMock} className="mt-5 space-y-5">
              {/* Exam type toggle */}
              <div>
                <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Exam type
                </span>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-ink-950">
                  {MOCK_EXAM_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMockType(t)}
                      className={cn(
                        "rounded-lg px-5 py-1.5 text-sm font-semibold transition-all",
                        mockType === t
                          ? "bg-white text-brand-700 shadow-sm dark:bg-ink-800 dark:text-brand-300"
                          : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Categories
                  </span>
                  {categories && categories.length > 0 && (
                    <div className="flex items-center gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedCats(
                            new Set(categories.map((c) => c.category))
                          )
                        }
                        className="font-medium text-brand-600 hover:underline dark:text-brand-300"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCats(new Set())}
                        className="font-medium text-slate-500 hover:underline dark:text-slate-400"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
                {catsLoading ? (
                  <LoadingBlock label="Loading categories..." />
                ) : catsError ? (
                  <ErrorAlert message={catsError} />
                ) : !categories || categories.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-500 dark:border-ink-800 dark:text-slate-400">
                    No categories available for {mockType} yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c, i) => {
                      const active = selectedCats.has(c.category);
                      const palette = CHIP_PALETTE[i % CHIP_PALETTE.length];
                      return (
                        <button
                          key={c.category}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleCategory(c.category)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition-all active:scale-[0.97]",
                            active ? palette.on : CHIP_OFF
                          )}
                        >
                          {c.category}
                          <span
                            className={cn(
                              "text-xs",
                              active
                                ? palette.count
                                : "text-slate-400 dark:text-slate-500"
                            )}
                          >
                            ({c.count})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Question count + duration */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Number of questions"
                  name="mock_num_questions"
                  type="number"
                  min={1}
                  max={200}
                  value={mockNumQuestions}
                  onChange={(e) =>
                    setMockNumQuestions(
                      Math.max(1, Math.min(200, Number(e.target.value) || 1))
                    )
                  }
                  required
                />
                <Input
                  label="Duration (minutes)"
                  name="mock_duration"
                  type="number"
                  min={1}
                  value={mockDuration}
                  onChange={(e) =>
                    setMockDuration(Math.max(1, Number(e.target.value) || 1))
                  }
                  required
                />
              </div>

              {/* Negative marking toggle */}
              <button
                type="button"
                onClick={() => setNegativeMarking((v) => !v)}
                aria-pressed={negativeMarking}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors",
                  negativeMarking
                    ? "border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10"
                    : "border-slate-200 bg-slate-50 dark:border-ink-800 dark:bg-ink-950"
                )}
              >
                <span className="flex items-center gap-2">
                  <Zap
                    className={cn(
                      "h-4 w-4",
                      negativeMarking
                        ? "text-rose-500 dark:text-rose-300"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  />
                  <span className="text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Negative marking
                    </span>
                    {negativeMarking && (
                      <span className="ml-2 text-xs text-rose-600 dark:text-rose-300">
                        -0.25 per wrong answer
                      </span>
                    )}
                  </span>
                </span>
                <span
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    negativeMarking
                      ? "bg-rose-500"
                      : "bg-slate-300 dark:bg-ink-800"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      negativeMarking ? "translate-x-[22px]" : "translate-x-0.5"
                    )}
                  />
                </span>
              </button>

              <ErrorAlert message={mockError} />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedCats.size} categor
                  {selectedCats.size === 1 ? "y" : "ies"} selected. This can take
                  a few seconds if the bank needs topping up.
                </p>
                <Button
                  type="submit"
                  variant="secondary"
                  loading={mockStarting}
                  disabled={catsLoading || selectedCats.size === 0}
                  className="shrink-0"
                >
                  <Sparkles className="h-4 w-4" />
                  {mockStarting ? "Preparing test..." : "Start Mock Test"}
                </Button>
              </div>
            </form>
          </CardBody>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Create form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader title="Create Test" subtitle="Configure a new mock test" />
            <CardBody>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CSS General Knowledge"
                  required
                />
                <Select
                  label="Exam type"
                  name="test_type"
                  value={testType}
                  onChange={(e) => setTestType(e.target.value)}
                >
                  {EXAM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
                <Select
                  label="Mode"
                  name="mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as TestMode)}
                >
                  {MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Subject IDs (comma separated, optional)"
                  name="subject_ids"
                  value={subjectIds}
                  onChange={(e) => setSubjectIds(e.target.value)}
                  placeholder="id1, id2"
                />
                <Input
                  label="Topic IDs (comma separated, optional)"
                  name="topic_ids"
                  value={topicIds}
                  onChange={(e) => setTopicIds(e.target.value)}
                  placeholder="id1, id2"
                />
                <Select
                  label="Difficulty"
                  name="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Number of questions"
                  name="num_questions"
                  type="number"
                  min={1}
                  max={100}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  required
                />
                <Input
                  label="Duration (minutes)"
                  name="duration_minutes"
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  required
                />

                <ErrorAlert message={formError} />
                <SuccessAlert message={success} />

                <Button type="submit" loading={submitting} className="w-full">
                  <Plus className="h-4 w-4" /> Create Test
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Your Tests"
              subtitle="Past and available tests"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTests}
                  loading={loading}
                >
                  Refresh
                </Button>
              }
            />
            <CardBody>
              {loading ? (
                <LoadingBlock label="Loading tests..." />
              ) : listError ? (
                <ErrorAlert message={listError} />
              ) : !tests || tests.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No tests yet"
                  description="Create your first mock test using the form."
                />
              ) : (
                <div className="space-y-3">
                  {tests.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-brand-300 hover:bg-slate-100 dark:border-ink-800 dark:bg-ink-950 dark:hover:border-brand-500/40 dark:hover:bg-ink-800 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {t.title}
                          </p>
                          <Badge color="brand">{t.test_type}</Badge>
                          {t.difficulty && (
                            <Badge color="gray">{t.difficulty}</Badge>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <ListChecks className="h-3.5 w-3.5" />
                            {t.num_questions} questions
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {t.duration_minutes} min
                          </span>
                          {t.created_at && (
                            <span>{formatDate(t.created_at)}</span>
                          )}
                        </div>
                      </div>
                      <Link href={`/tests/${t.id}/take`} className="shrink-0">
                        <Button size="sm">Start</Button>
                      </Link>
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
