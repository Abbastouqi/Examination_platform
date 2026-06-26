"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Clock, ListChecks } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { Test, CreateTestRequest, TestMode } from "@/lib/types";
import { EXAM_TYPES, DIFFICULTIES, formatDate } from "@/lib/utils";
import AppShell, { PageHeader } from "@/components/AppShell";
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

function splitIds(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function TestsPage() {
  // list state
  const [tests, setTests] = useState<Test[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

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
