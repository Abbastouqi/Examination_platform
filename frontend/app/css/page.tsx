import Link from "next/link";
import {
  PenLine,
  FileText,
  MessageSquare,
  ArrowRight,
  Info,
} from "lucide-react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { Card, CardBody, Badge } from "@/components/ui";
import { HeroStudy, Bulb } from "@/components/Illustrations";

interface ActionCard {
  href: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string; // pastel bg + text for the icon tile
  ring: string; // hover ring color
}

const ACTIONS: ActionCard[] = [
  {
    href: "/css/essay",
    title: "Essay Evaluation",
    desc: "Write a CSS-style essay and get it graded against examiner criteria with detailed feedback.",
    icon: PenLine,
    accent:
      "bg-violet-100 text-violet-700 dark:bg-brand-500/15 dark:text-brand-300",
    ring: "hover:border-brand-300 dark:hover:border-brand-500/50",
  },
  {
    href: "/css/precis",
    title: "Précis Evaluation",
    desc: "Practise précis writing — condense a passage and receive a scored, structured critique.",
    icon: FileText,
    accent:
      "bg-emerald-100 text-emerald-700 dark:bg-accent-500/15 dark:text-accent-300",
    ring: "hover:border-accent-300 dark:hover:border-accent-500/50",
  },
  {
    href: "/css/guide",
    title: "CSS Guidelines Assistant",
    desc: "Ask anything about the CSS exam — subjects, rules, patterns, and preparation strategy.",
    icon: MessageSquare,
    accent:
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    ring: "hover:border-amber-300 dark:hover:border-amber-500/50",
  },
];

const COMPULSORY = [
  "English Essay",
  "English (Précis & Composition)",
  "General Science & Ability",
  "Current Affairs",
  "Pakistan Affairs",
  "Islamic Studies / Comparative Religion",
];

export default function CssHubPage() {
  return (
    <AppShell>
      <PageHeader
        title="CSS Preparation"
        description="Sharpen your essay and précis writing, and get instant answers about the CSS exam."
      />

      {/* Intro hero */}
      <Card className="mb-6 overflow-hidden animate-fade-up">
        <CardBody className="doodle-bg flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
              Prepare for the{" "}
              <span className="text-gradient">CSS</span> exam
              <span className="squiggle ml-1" />
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-600 dark:text-slate-400">
              The Central Superior Services (CSS) competitive exam rewards clear
              thinking and disciplined writing. Draft an essay or a précis, and
              our AI examiner grades it against CSS standards — then ask the
              assistant to fill any gaps in your prep.
            </p>
            <div className="mt-3 flex items-center gap-2 text-brand-600 dark:text-brand-300">
              <Bulb className="h-7 w-7 text-slate-900 dark:text-slate-100" />
              <span className="text-sm font-medium">
                Tip: consistent daily writing practice beats last-minute cramming.
              </span>
            </div>
          </div>
          <HeroStudy className="h-40 w-52 shrink-0 text-slate-900 dark:text-slate-100 sm:h-48 sm:w-60" />
        </CardBody>
      </Card>

      {/* Action cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.href} href={a.href} className="group">
              <Card
                className={`h-full rounded-3xl border-2 transition-all hover:shadow-cardhover ${a.ring}`}
              >
                <CardBody className="flex h-full flex-col">
                  <div
                    className={`mb-4 inline-flex w-fit rounded-2xl p-3 ${a.accent}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                    {a.title}
                  </h3>
                  <p className="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-400">
                    {a.desc}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-transform group-hover:translate-x-0.5 dark:text-brand-300">
                    Open <ArrowRight className="h-4 w-4" />
                  </span>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* CSS at a glance */}
      <Card className="rounded-3xl">
        <CardBody>
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-sky-100 p-2 text-sky-700 dark:bg-brand-500/15 dark:text-brand-300">
              <Info className="h-5 w-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              CSS at a glance
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Compulsory */}
            <div className="rounded-2xl bg-violet-50 p-4 dark:bg-ink-950">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Compulsory papers
                </h4>
                <Badge color="brand">6 × 100 = 600</Badge>
              </div>
              <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                {COMPULSORY.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* Optional + qualifying */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-ink-950">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Optional subjects
                  </h4>
                  <Badge color="accent">600 marks</Badge>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  Candidates choose optional subjects totalling{" "}
                  <span className="font-semibold">600 marks</span> (subjects of
                  100 or 200 marks each) from the approved list, bringing the
                  written exam to{" "}
                  <span className="font-semibold">1200 marks</span>.
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50 p-4 dark:bg-ink-950">
                <h4 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Qualifying marks
                </h4>
                <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>
                      <span className="font-semibold">40%</span> in each
                      compulsory paper
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>
                      <span className="font-semibold">33%</span> in each optional
                      paper
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>
                      <span className="font-semibold">50%</span> aggregate to
                      qualify for the interview
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
            Rules can change — verify at fpsc.gov.pk.
          </p>
        </CardBody>
      </Card>
    </AppShell>
  );
}
