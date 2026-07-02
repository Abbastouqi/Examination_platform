"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Plus,
  Send,
  Trash2,
  Pencil,
  MessageSquare,
  Menu,
  Sparkles,
  FileText,
  CalendarClock,
  Target,
  Bot,
  User as UserIcon,
  Lightbulb,
  Database,
  X,
  Square,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { api, ApiError, streamSSE } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  Conversation,
  ConversationDetail,
  ChatMessage,
} from "@/lib/types";
import {
  Button,
  Input,
  Modal,
  Spinner,
  ErrorAlert,
} from "@/components/ui";

// ---------------- Static content ----------------
interface Suggestion {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  prompt: string;
  tint: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: Sparkles,
    title: "Generate 10 FPSC General Knowledge MCQs",
    prompt:
      "Generate 10 FPSC General Knowledge MCQs with four options each, the correct answer, and a short explanation for every question.",
    tint: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
  },
  {
    icon: CalendarClock,
    title: "Create a 30-day CSS study plan",
    prompt:
      "Create a detailed 30-day CSS exam study plan. Break it down day by day with topics, focus areas, and recommended daily study hours.",
    tint: "bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300",
  },
  {
    icon: FileText,
    title: "Explain the Lahore Resolution",
    prompt:
      "Explain the Lahore Resolution (1940) — its background, key points, significance, and impact on the Pakistan Movement.",
    tint: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  },
  {
    icon: Target,
    title: "Quiz me on Pakistan Affairs",
    prompt:
      "Quiz me on Pakistan Affairs. Ask me one question at a time, wait for my answer, then tell me if I'm correct and explain why before moving on.",
    tint: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  },
  {
    icon: Lightbulb,
    title: "Common NTS English mistakes",
    prompt:
      "What are the most common English mistakes students make in NTS tests? Give examples and how to avoid them.",
    tint: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    icon: FileText,
    title: "Summarize the 1973 Constitution",
    prompt:
      "Summarize the 1973 Constitution of Pakistan — its salient features, key articles, and historical importance.",
    tint: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
  },
];

const MCQ_TEMPLATE =
  "Generate 10 MCQs for [exam, e.g. FPSC] on the topic of [subject]. For each question include four options (A–D), mark the correct answer, and add a one-line explanation.";
const PLAN_TEMPLATE =
  "Create a study plan for the [exam, e.g. CSS] exam. I have [number] days available and can study [number] hours per day. Break it down day by day with topics and focus areas.";
const WEAK_TEMPLATE =
  "Based on common exam patterns, help me identify and improve my weak areas in [subject]. Suggest targeted practice and resources.";

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [useRag, setUseRag] = useState<boolean>(false);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [loadingThread, setLoadingThread] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState<boolean>(false);

  // rename modal state
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");
  const [renaming, setRenaming] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const loadConversations = async () => {
    try {
      const list = await api.get<Conversation[]>("/chat/conversations");
      setConversations(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Failed to load conversations."
      );
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  // auto-grow the composer textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const selectConversation = async (id: string) => {
    setListOpen(false);
    setError(null);
    setLoadingThread(true);
    setCurrentId(id);
    try {
      const detail = await api.get<ConversationDetail>(
        `/chat/conversations/${id}`
      );
      setMessages(Array.isArray(detail?.messages) ? detail.messages : []);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Failed to load conversation."
      );
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  };

  const newChat = () => {
    setCurrentId(null);
    setMessages([]);
    setError(null);
    setListOpen(false);
  };

  const deleteConversation = async (id: string) => {
    try {
      await api.del(`/chat/conversations/${id}`);
      if (id === currentId) newChat();
      await loadConversations();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Failed to delete conversation."
      );
    }
  };

  const openRename = (c: Conversation) => {
    setRenameTarget(c);
    setRenameValue(c.title || "");
  };

  const submitRename = async () => {
    if (!renameTarget) return;
    setRenaming(true);
    try {
      await api.patch(`/chat/conversations/${renameTarget.id}`, {
        title: renameValue.trim() || "Untitled",
      });
      setRenameTarget(null);
      await loadConversations();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Failed to rename conversation."
      );
    } finally {
      setRenaming(false);
    }
  };

  const appendToLastAssistant = (delta: string) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === "assistant") {
        next[next.length - 1] = { ...last, content: last.content + delta };
      }
      return next;
    });
  };

  // Core send routine. Accepts an explicit text so suggestion cards / quick
  // actions can send directly without depending on async state updates.
  const sendMessage = async (raw: string) => {
    const text = raw.trim();
    if (!text || streaming) return;
    setError(null);
    setInput("");

    // push user message + empty assistant placeholder
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let createdId: string | undefined;
    try {
      const gen = streamSSE(
        "/chat/message",
        { chat_id: currentId ?? undefined, message: text, use_rag: useRag },
        { signal: controller.signal }
      );
      while (true) {
        const { value, done } = await gen.next();
        if (done) {
          const info = value as { chat_id?: string } | undefined;
          if (info?.chat_id) createdId = info.chat_id;
          break;
        }
        appendToLastAssistant(value);
      }
      // if this was a new conversation, adopt the returned id + refresh list
      if (!currentId && createdId) {
        setCurrentId(createdId);
        await loadConversations();
      }
    } catch (e) {
      // A user-initiated Stop aborts the fetch — keep the partial text, no error.
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e as Error)?.name === "AbortError";
      if (!aborted) {
        const msg =
          e instanceof ApiError ? e.message : "Something went wrong while sending.";
        setError(msg);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant" && !last.content) {
            next[next.length - 1] = { ...last, content: `⚠️ ${msg}` };
          }
          return next;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleSend = () => sendMessage(input);

  const stopGenerating = () => abortRef.current?.abort();

  // Regenerate: drop the last assistant reply and re-send the last user message.
  const regenerate = () => {
    if (streaming) return;
    let lastUser: string | null = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUser = messages[i].content;
        break;
      }
    }
    if (!lastUser) return;
    // Remove trailing assistant message(s) so sendMessage appends a fresh one.
    setMessages((prev) => {
      const next = [...prev];
      while (next.length && next[next.length - 1].role === "assistant") next.pop();
      // also drop the last user message; sendMessage re-adds it
      if (next.length && next[next.length - 1].role === "user") next.pop();
      return next;
    });
    // defer so state settles before re-sending
    requestAnimationFrame(() => sendMessage(lastUser as string));
  };

  const copyMessage = async (content: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx((c) => (c === idx ? null : c)), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  // Prefill the composer with a template and focus it.
  const fillComposer = (text: string) => {
    setInput(text);
    setListOpen(false);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isEmpty = messages.length === 0;

  // ---------------- Sidebar (shared by desktop + mobile drawer) ----------------
  const Sidebar = (
    <>
      <div className="border-b border-slate-200 p-3 dark:border-ink-800">
        <Button className="w-full" size="sm" onClick={newChat}>
          <Plus className="h-4 w-4" /> New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
        {conversations.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
            No conversations yet.
          </p>
        ) : (
          conversations.map((c) => {
            const active = c.id === currentId;
            return (
              <div
                key={c.id}
                className={cn(
                  "group mb-1 flex items-center gap-1 rounded-lg px-2 py-2 transition-colors",
                  active
                    ? "bg-brand-50 text-brand-900 ring-1 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-100 dark:ring-brand-500/30"
                    : "hover:bg-slate-100 dark:hover:bg-ink-800"
                )}
              >
                <button
                  onClick={() => selectConversation(c.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <MessageSquare
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active
                        ? "text-brand-600 dark:text-brand-300"
                        : "text-slate-400 dark:text-slate-500"
                    )}
                  />
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                    {c.title || "Untitled"}
                  </span>
                </button>
                <button
                  onClick={() => openRename(c)}
                  className="rounded p-1 text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-600 group-hover:opacity-100 dark:hover:bg-ink-700 dark:hover:text-slate-200"
                  title="Rename"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => deleteConversation(c.id)}
                  className="rounded p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );

  return (
    <AppShell>
      <PageHeader
        title="AI Study Assistant"
        description="Ask questions, generate MCQs, and study with your AI tutor."
        action={
          <button
            onClick={() => setListOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 dark:border-ink-800 dark:text-slate-200 lg:hidden"
          >
            <Menu className="h-4 w-4" /> Conversations
          </button>
        }
      />

      <div className="flex h-[calc(100vh-13rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900">
        {/* LEFT: conversation list (desktop) */}
        <aside className="hidden w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50 dark:border-ink-800 dark:bg-ink-950 lg:flex">
          {Sidebar}
        </aside>

        {/* Mobile drawer */}
        {listOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setListOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] animate-fade-in flex-col bg-slate-50 shadow-xl dark:bg-ink-950">
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-ink-800">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Conversations
                </span>
                <button
                  onClick={() => setListOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-ink-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {Sidebar}
            </div>
          </div>
        )}

        {/* RIGHT: thread */}
        <section className="flex min-w-0 flex-1 flex-col bg-slate-50/40 dark:bg-ink-950/40">
          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6">
            {error && (
              <div className="mx-auto mb-4 max-w-3xl">
                <ErrorAlert message={error} />
              </div>
            )}
            {loadingThread ? (
              <div className="flex h-full items-center justify-center">
                <Spinner className="h-6 w-6" />
              </div>
            ) : isEmpty ? (
              // ---------- Empty / welcome hero ----------
              <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center py-6 text-center">
                <div className="mb-5 animate-fade-up rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 p-4 shadow-glow">
                  <Bot className="h-8 w-8 text-white" />
                </div>
                <h2 className="animate-fade-up text-3xl font-bold tracking-tight">
                  <span className="text-gradient">AI Study Assistant</span>
                </h2>
                <p className="mt-2 max-w-md animate-fade-up text-sm text-slate-500 dark:text-slate-400">
                  Your personal tutor for FPSC, CSS, PMS, NTS and more. Ask
                  anything, or start with a suggestion below.
                </p>

                <div className="mt-8 grid w-full animate-fade-up gap-3 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.title}
                        onClick={() => sendMessage(s.prompt)}
                        disabled={streaming}
                        className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-cardhover disabled:cursor-not-allowed disabled:opacity-60 dark:border-ink-800 dark:bg-ink-900 dark:hover:border-brand-500/40"
                      >
                        <div className={cn("shrink-0 rounded-lg p-2", s.tint)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {s.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              // ---------- Message thread ----------
              <div className="mx-auto max-w-3xl space-y-5">
                {messages.map((m, i) => {
                  const isUser = m.role === "user";
                  const isStreamingBubble =
                    !isUser && !m.content && streaming && i === messages.length - 1;
                  return (
                    <div
                      key={m.id || i}
                      className={cn(
                        "flex animate-fade-in gap-3",
                        isUser ? "justify-end" : "justify-start"
                      )}
                    >
                      {!isUser && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-sm">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm",
                          isUser
                            ? "rounded-br-md bg-brand-600 text-white"
                            : "rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-ink-800 dark:bg-ink-900 dark:text-slate-100"
                        )}
                      >
                        {isUser ? (
                          <span className="whitespace-pre-wrap">{m.content}</span>
                        ) : m.content ? (
                          <>
                            <div className="prose-chat">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {m.content}
                              </ReactMarkdown>
                            </div>
                            {!(streaming && i === messages.length - 1) && (
                              <div className="mt-2 flex items-center gap-1 border-t border-slate-100 pt-2 dark:border-ink-800">
                                <button
                                  onClick={() => copyMessage(m.content, i)}
                                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-ink-800 dark:hover:text-slate-200"
                                  title="Copy response"
                                >
                                  {copiedIdx === i ? (
                                    <Check className="h-3.5 w-3.5 text-accent-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                  {copiedIdx === i ? "Copied" : "Copy"}
                                </button>
                                {i === messages.length - 1 && (
                                  <button
                                    onClick={regenerate}
                                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-ink-800 dark:hover:text-slate-200"
                                    title="Regenerate response"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                                  </button>
                                )}
                              </div>
                            )}
                          </>
                        ) : isStreamingBubble ? (
                          <TypingIndicator />
                        ) : (
                          <Spinner className="h-4 w-4" />
                        )}
                      </div>
                      {isUser && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-ink-800 dark:text-slate-300">
                          <UserIcon className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-slate-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-900 sm:p-4">
            <div className="mx-auto max-w-3xl">
              {/* Quick actions */}
              <div className="mb-3 flex flex-wrap gap-2">
                <QuickAction
                  icon={Sparkles}
                  label="Generate MCQs"
                  onClick={() => fillComposer(MCQ_TEMPLATE)}
                />
                <QuickAction
                  icon={CalendarClock}
                  label="Create Study Plan"
                  onClick={() => fillComposer(PLAN_TEMPLATE)}
                />
                <QuickAction
                  icon={FileText}
                  label="Start Mock Test"
                  href="/tests"
                />
                <QuickAction
                  icon={Target}
                  label="Analyze Weak Areas"
                  onClick={() => fillComposer(WEAK_TEMPLATE)}
                />
              </div>

              <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200 dark:border-ink-800 dark:bg-ink-950 dark:focus-within:ring-brand-500/30">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  rows={1}
                  disabled={streaming}
                  placeholder="Ask your AI tutor anything…"
                  className="max-h-[200px] min-h-[40px] w-full resize-none bg-transparent px-2 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-60 dark:text-slate-100 dark:placeholder-slate-500"
                />
                {streaming ? (
                  <Button
                    onClick={stopGenerating}
                    variant="danger"
                    className="h-10 shrink-0 rounded-xl px-3"
                    aria-label="Stop generating"
                    title="Stop generating"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" /> Stop
                  </Button>
                ) : (
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="h-10 w-10 shrink-0 rounded-xl !p-0"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setUseRag((v) => !v)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                    useRag
                      ? "border-accent-300 bg-accent-50 text-accent-700 dark:border-accent-500/40 dark:bg-accent-500/15 dark:text-accent-300"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-ink-800 dark:bg-ink-900 dark:text-slate-400 dark:hover:bg-ink-800"
                  )}
                  title="Use your uploaded documents as context"
                >
                  <Database className="h-3.5 w-3.5" />
                  Knowledge base (RAG)
                  <span
                    className={cn(
                      "ml-0.5 inline-block h-1.5 w-1.5 rounded-full",
                      useRag ? "bg-accent-500" : "bg-slate-300 dark:bg-ink-700"
                    )}
                  />
                </button>
                <p className="hidden text-xs text-slate-400 dark:text-slate-500 sm:block">
                  Enter to send · Shift+Enter for a new line
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Rename modal */}
      <Modal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="Rename conversation"
        footer={
          <>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitRename} loading={renaming}>
              Save
            </Button>
          </>
        }
      >
        <Input
          label="Title"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          placeholder="Conversation title"
        />
      </Modal>
    </AppShell>
  );
}

// ---------------- Helper components ----------------
function QuickAction({
  icon: Icon,
  label,
  onClick,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const cls =
    "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-ink-800 dark:bg-ink-900 dark:text-slate-300 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300";
  if (href) {
    return (
      <Link href={href} className={cls}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function TypingIndicator() {
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
