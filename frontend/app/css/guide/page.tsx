"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Square,
  Copy,
  Check,
} from "lucide-react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { ApiError, streamSSE } from "@/lib/api";
import { Card, CardBody, Button, Textarea, ErrorAlert } from "@/components/ui";
import { BotMascot } from "@/components/Illustrations";

const SUGGESTED = [
  "What subjects can I choose in CSS?",
  "Which subjects are compulsory?",
  "Essay writing rules",
  "Précis writing rules",
  "Common mistakes candidates make",
  "Preparation strategy",
  "Paper pattern & marking",
  "Time management",
];

interface QA {
  id: number;
  question: string;
  answer: string; // grows as tokens stream in
  streaming: boolean;
  error?: string;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function GuidePage() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<QA[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const patch = (id: number, fields: Partial<QA>) =>
    setHistory((prev) => prev.map((qa) => (qa.id === id ? { ...qa, ...fields } : qa)));

  const ask = async (q: string) => {
    const query = q.trim();
    if (!query || streaming) return;
    setError(null);
    setStreaming(true);
    const id = Date.now();
    setHistory((prev) => [...prev, { id, question: query, answer: "", streaming: true }]);
    setQuestion("");

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const gen = streamSSE("/css/ask", { question: query }, { signal: controller.signal });
      while (true) {
        const { value, done } = await gen.next();
        if (done) break;
        // Functional updater appends to the current answer — no dropped tokens.
        setHistory((prev) =>
          prev.map((qa) => (qa.id === id ? { ...qa, answer: qa.answer + value } : qa))
        );
      }
    } catch (e) {
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e as Error)?.name === "AbortError";
      if (!aborted) {
        const msg = e instanceof ApiError ? e.message : "Failed to get an answer.";
        setError(msg);
        patch(id, { error: msg });
      }
    } finally {
      patch(id, { streaming: false });
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const copy = async (text: string, id: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(question);
  };

  return (
    <AppShell>
      <PageHeader
        title="CSS Guidelines Assistant"
        description="Ask anything about the CSS exam — subjects, rules, patterns and strategy."
        action={
          <Link href="/css">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" /> Back to CSS
            </Button>
          </Link>
        }
      />

      <Card className="mb-6 rounded-3xl">
        <CardBody>
          <div className="mb-4 flex items-center gap-3">
            <BotMascot className="h-10 w-10 text-slate-900 dark:text-slate-100" />
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Ask the assistant
                <span className="squiggle ml-1" />
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pick a starter question or type your own.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                type="button"
                disabled={streaming}
                onClick={() => ask(s)}
                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
              >
                {s}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-4">
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(question);
                }
              }}
              rows={3}
              placeholder="Type your question… (Enter to send, Shift+Enter for a new line)"
              className="resize-y"
            />
            <div className="mt-3 flex justify-end">
              {streaming ? (
                <Button type="button" variant="danger" onClick={stop}>
                  <Square className="h-3.5 w-3.5 fill-current" /> Stop generating
                </Button>
              ) : (
                <Button type="submit" disabled={!question.trim()}>
                  <Send className="h-4 w-4" /> Ask
                </Button>
              )}
            </div>
          </form>

          {error && (
            <div className="mt-3">
              <ErrorAlert message={error} />
            </div>
          )}
        </CardBody>
      </Card>

      {history.length === 0 ? (
        <Card className="rounded-3xl border-dashed">
          <CardBody className="flex flex-col items-center gap-3 py-10 text-center">
            <MessageSquare className="h-8 w-8 text-brand-500 dark:text-brand-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Your questions and answers will appear here.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {[...history].reverse().map((qa) => (
            <Card key={qa.id} className="rounded-3xl">
              <CardBody>
                <div className="mb-3 flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-brand-100 p-1.5 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {qa.question}
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    <BotMascot className="h-7 w-7 text-slate-900 dark:text-slate-100" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {qa.error ? (
                      <ErrorAlert message={qa.error} />
                    ) : qa.answer ? (
                      <>
                        <div className="prose-chat text-sm text-slate-700 dark:text-slate-300">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {qa.answer}
                          </ReactMarkdown>
                        </div>
                        {!qa.streaming && (
                          <button
                            onClick={() => copy(qa.answer, qa.id)}
                            className="mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-ink-800 dark:hover:text-slate-200"
                          >
                            {copiedId === qa.id ? (
                              <Check className="h-3.5 w-3.5 text-accent-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            {copiedId === qa.id ? "Copied" : "Copy"}
                          </button>
                        )}
                      </>
                    ) : (
                      <TypingDots />
                    )}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        FPSC rules and the CSS scheme change over time — always verify the
        latest details at fpsc.gov.pk.
      </p>
    </AppShell>
  );
}
