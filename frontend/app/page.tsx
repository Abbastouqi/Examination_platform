"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Sparkles,
  FileText,
  MessageSquare,
  BarChart3,
  Trophy as TrophyIcon,
  Target,
  BookOpen,
  Brain,
  Clock,
  CheckCircle2,
  ArrowRight,
  Zap,
  ShieldCheck,
  Landmark,
  Building2,
  Scale,
  Briefcase,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Plan } from "@/lib/types";
import { Button, Card, CardBody, Badge } from "@/components/ui";
import { ThemeToggle } from "@/components/theme";
import {
  HeroStudy,
  BooksStack,
  Trophy,
  Bulb,
  TargetDoodle,
  BotMascot,
  Squiggle,
} from "@/components/Illustrations";

/* ------------------------------------------------------------------ data */

// Rotating pastel fills for the exam chips (light + dark).
const EXAM_TINTS = [
  "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
];

const EXAMS = [
  { name: "FPSC", icon: Landmark, note: "Federal Public Service Commission" },
  { name: "NTS", icon: FileText, note: "National Testing Service batteries" },
  { name: "PPSC", icon: Building2, note: "Punjab Public Service Commission" },
  { name: "FGEI EST", icon: BookOpen, note: "Elementary School Teacher cadre" },
  { name: "Lecturer", icon: GraduationCap, note: "Subject lecturer screening" },
  { name: "PMS", icon: Scale, note: "Provincial Management Service" },
  { name: "CSS", icon: TrophyIcon, note: "Central Superior Services" },
  { name: "Govt Jobs", icon: Briefcase, note: "General government job tests" },
];

const FEATURES = [
  {
    icon: Brain,
    title: "AI MCQ Generation",
    desc: "Spin up fresh, exam-style multiple-choice questions on any subject or topic in seconds.",
    tile: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
    art: BooksStack,
  },
  {
    icon: Clock,
    title: "Realistic Mock Tests",
    desc: "Sit full-length, timed mock tests that mirror the real paper, with instant scoring.",
    tile: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
    art: Trophy,
  },
  {
    icon: MessageSquare,
    title: "AI Study Assistant",
    desc: "Chat with an AI tutor that explains concepts and answers from past papers and notes.",
    tile: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
    art: BotMascot,
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    desc: "Track score trends, accuracy and time-per-question across every attempt you make.",
    tile: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    art: null,
  },
  {
    icon: Target,
    title: "Personalized Study Plans",
    desc: "Get a day-by-day plan tailored to your exam, subjects and time left before the test.",
    tile: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
    art: TargetDoodle,
  },
  {
    icon: Zap,
    title: "Weak-Area Detection",
    desc: "We pinpoint the exact topics dragging your score down so you can fix them fast.",
    tile: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
    art: Bulb,
  },
];

const STEPS = [
  {
    icon: Target,
    title: "Choose your exam",
    desc: "Pick FPSC, PPSC, CSS, EST or any test you're preparing for.",
    tint: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
  },
  {
    icon: FileText,
    title: "Practice & take mocks",
    desc: "Generate MCQs and sit realistic, timed mock tests on demand.",
    tint: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
  },
  {
    icon: MessageSquare,
    title: "Get AI feedback",
    desc: "Ask the AI tutor anything and get clear, grounded explanations.",
    tint: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
  },
  {
    icon: BarChart3,
    title: "Track your progress",
    desc: "Watch analytics surface your weak areas and improving trend.",
    tint: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  },
];

/* ------------------------------------------------------------------ logo */

function Logo({ withText = true }: { withText?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 shadow-glow">
        <GraduationCap className="h-5 w-5 text-white" />
      </span>
      {withText && (
        <span className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          PrepGenius
        </span>
      )}
    </Link>
  );
}

/* --------------------------------------------------------------- pricing */

function Pricing() {
  const [plans, setPlans] = useState<Plan[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.get<Plan[]>("/subscriptions/plans", {
          noAuth: true,
        });
        if (active && Array.isArray(data) && data.length) setPlans(data);
      } catch {
        if (active) setPlans(null);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!plans) return null;

  // Pick a recommended plan: prefer the middle one, else the second.
  const recommendedIdx = plans.length >= 3 ? 1 : plans.length === 2 ? 1 : -1;

  return (
    <section id="pricing" className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <Badge color="brand">Pricing</Badge>
          <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Simple, transparent plans
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300">
            Start free and upgrade when you&apos;re ready to go all in on your
            preparation.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, i) => {
            const highlight = i === recommendedIdx;
            const isFree = plan.price <= 0;
            return (
              <Card
                key={plan.key}
                className={
                  "relative rounded-3xl " +
                  (highlight
                    ? "border-brand-300 ring-2 ring-brand-400 shadow-soft dark:border-brand-500/50"
                    : "transition-all hover:-translate-y-1 hover:shadow-soft")
                }
              >
                {highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-brand-600 to-accent-500 px-3.5 py-1 text-xs font-bold text-white shadow-sm">
                    Popular
                  </span>
                )}
                <CardBody className="flex h-full flex-col p-7">
                  <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                    {plan.name}
                  </h3>
                  <div className="mt-3 flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                      {isFree ? "Free" : `Rs ${plan.price.toLocaleString()}`}
                    </span>
                    {!isFree && (
                      <span className="mb-1 text-sm text-slate-500 dark:text-slate-400">
                        / {plan.duration_days} days
                      </span>
                    )}
                  </div>
                  <ul className="mt-6 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                      >
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700 dark:bg-accent-500/20 dark:text-accent-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/signup" className="mt-7 block">
                    <Button
                      className="w-full rounded-full"
                      variant={highlight ? "primary" : "outline"}
                    >
                      {isFree ? "Get started free" : `Choose ${plan.name}`}
                    </Button>
                  </Link>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ page */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const heroCtas = [
    { label: "Start Preparation", primary: true, icon: ArrowRight },
    { label: "Take Mock Test", primary: false, icon: Clock },
    { label: "Practice MCQs", primary: false, icon: FileText },
    { label: "AI Study Assistant", primary: false, icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-cream text-slate-900 dark:bg-ink-950 dark:text-slate-200">
      {/* ---------------------------------------------------------- nav */}
      <header
        className={
          "sticky top-0 z-40 transition-colors " +
          (scrolled
            ? "glass border-b border-slate-200/70 dark:border-ink-800"
            : "border-b border-transparent bg-transparent")
        }
      >
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
          <Logo />
          <div className="hidden items-center gap-7 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-white"
            >
              Features
            </a>
            <a
              href="#exams"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-white"
            >
              Exams
            </a>
            <a
              href="#how"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-white"
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-300 dark:hover:text-white"
            >
              Pricing
            </a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm" className="rounded-full">
                Log in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="rounded-full">
                Get started
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* --------------------------------------------------------- hero */}
      <section className="doodle-bg relative overflow-hidden">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          {/* copy */}
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
              <Sparkles className="h-3.5 w-3.5" /> AI-powered exam preparation
            </span>
            <h1 className="font-display mt-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Prepare smarter.
              <br />
              Pass{" "}
              <span className="relative inline-block">
                <span className="text-gradient">faster</span>
                <Squiggle className="absolute -bottom-3 left-0 h-3 w-full text-orange-500" />
              </span>
              .
            </h1>
            <p className="mt-7 max-w-xl text-lg text-slate-600 dark:text-slate-300">
              PrepGenius generates exam-style MCQs, runs realistic timed mock
              tests, answers your questions with an AI tutor and tracks the
              analytics that reveal exactly what to study next.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap gap-3">
              {heroCtas.map((cta) => (
                <Link key={cta.label} href="/signup">
                  <Button
                    size="lg"
                    variant={cta.primary ? "primary" : "outline"}
                    className="rounded-full"
                  >
                    <cta.icon className="h-4 w-4" />
                    {cta.label}
                  </Button>
                </Link>
              ))}
              <Link href="/trial">
                <Button size="lg" variant="ghost" className="rounded-full">
                  Try 4 free questions
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* trust stats */}
            <div className="mt-10 flex flex-wrap items-center gap-3">
              {[
                { icon: ShieldCheck, label: "7+ exams covered", tint: "text-accent-600 dark:text-accent-300" },
                { icon: FileText, label: "10k+ practice MCQs", tint: "text-brand-600 dark:text-brand-300" },
                { icon: Sparkles, label: "AI-powered tutor", tint: "text-amber-500 dark:text-amber-300" },
              ].map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3.5 py-1.5 text-sm font-medium text-slate-600 shadow-sm dark:border-ink-800 dark:bg-ink-900/60 dark:text-slate-300"
                >
                  <s.icon className={"h-4 w-4 " + s.tint} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* illustration */}
          <div className="relative flex justify-center lg:justify-end animate-fade-up">
            <div className="relative w-full max-w-lg">
              <div className="rounded-3xl bg-white/70 p-6 shadow-soft ring-1 ring-slate-200/70 backdrop-blur-sm dark:bg-ink-900/60 dark:ring-ink-800">
                <div className="animate-float">
                  <HeroStudy className="w-full text-slate-900 dark:text-white" />
                </div>
              </div>

              {/* floating sticker chips */}
              <div className="absolute -left-4 top-8 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-soft ring-1 ring-slate-200/70 dark:bg-ink-900 dark:ring-ink-800 sm:-left-8">
                <Trophy className="h-7 w-7 text-slate-900 dark:text-white" />
                <div className="leading-tight">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Top scorer
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    97th percentile
                  </p>
                </div>
              </div>

              <div className="absolute -right-2 bottom-10 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-soft ring-1 ring-slate-200/70 dark:bg-ink-900 dark:ring-ink-800 sm:-right-6">
                <Bulb className="h-7 w-7 text-slate-900 dark:text-white" />
                <div className="leading-tight">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Smart hints
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    on every answer
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- exams */}
      <section id="exams" className="px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <Badge color="accent">Coverage</Badge>
            <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Built for every major exam
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              From federal commissions to provincial services and teaching
              cadres — PrepGenius has you covered.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {EXAMS.map((exam, i) => (
              <Card
                key={exam.name}
                className="group rounded-3xl transition-all hover:-translate-y-1 hover:shadow-soft"
              >
                <CardBody className="flex items-start gap-3 p-5">
                  <span
                    className={
                      "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 " +
                      EXAM_TINTS[i % EXAM_TINTS.length]
                    }
                  >
                    <exam.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-slate-900 dark:text-white">
                      {exam.name}
                    </p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">
                      {exam.note}
                    </p>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ features */}
      <section
        id="features"
        className="doodle-bg border-y border-slate-200/70 px-6 py-20 dark:border-ink-800 sm:py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <Badge color="brand">Features</Badge>
            <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Everything you need to ace your exam
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              One platform that replaces a shelf of guidebooks, a stopwatch and a
              private tutor.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Art = f.art;
              return (
                <Card
                  key={f.title}
                  className="group rounded-3xl bg-white transition-all hover:-translate-y-1 hover:shadow-soft dark:bg-ink-900"
                >
                  <CardBody className="p-7">
                    <div className="flex items-start justify-between">
                      <div
                        className={
                          "inline-flex rounded-2xl p-3 transition-transform group-hover:scale-110 " +
                          f.tile
                        }
                      >
                        <f.icon className="h-6 w-6" />
                      </div>
                      {Art && (
                        <Art className="h-10 w-10 text-slate-900 opacity-80 dark:text-white" />
                      )}
                    </div>
                    <h3 className="font-display mt-5 text-base font-bold text-slate-900 dark:text-white">
                      {f.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                      {f.desc}
                    </p>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- how it works */}
      <section id="how" className="px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <Badge color="accent">How it works</Badge>
            <h2 className="font-display mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              From zero to exam-ready in four steps
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              A simple loop that keeps you improving every single day.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Card
                key={step.title}
                className="group relative h-full rounded-3xl transition-all hover:-translate-y-1 hover:shadow-soft"
              >
                <CardBody className="p-7">
                  <div className="flex items-center gap-3">
                    <span className="font-display inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 text-base font-extrabold text-white shadow-glow">
                      {i + 1}
                    </span>
                    <span
                      className={
                        "inline-flex rounded-2xl p-2.5 " + step.tint
                      }
                    >
                      <step.icon className="h-5 w-5" />
                    </span>
                  </div>
                  <h3 className="font-display mt-5 text-base font-bold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
                    {step.desc}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- pricing */}
      <Pricing />

      {/* ------------------------------------------------------ final cta */}
      <section className="px-6 pb-20 sm:pb-24">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-600 to-accent-600 px-8 py-16 shadow-glow sm:px-12">
          <div className="orb h-64 w-64 bg-white/20 -top-16 -right-10" aria-hidden />
          <div className="orb h-64 w-64 bg-brand-950/30 -bottom-20 -left-10" aria-hidden />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div className="text-center lg:text-left">
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Start your preparation today
              </h2>
              <p className="mt-4 text-lg text-brand-50">
                Join aspirants preparing the smart way with AI-driven practice,
                mock tests and analytics built for Pakistan&apos;s toughest
                exams.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Link href="/signup">
                  <Button
                    size="lg"
                    className="rounded-full bg-white text-brand-700 hover:bg-brand-50"
                  >
                    Get started free <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10 dark:border-white/40 dark:bg-transparent dark:text-white dark:hover:bg-white/10"
                  >
                    Log in
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden justify-center lg:flex">
              <div className="animate-float rounded-3xl bg-white/15 p-6 ring-1 ring-white/20 backdrop-blur-sm">
                <Trophy className="h-28 w-28 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- footer */}
      <footer className="border-t border-slate-200/70 bg-white px-6 py-12 dark:border-ink-800 dark:bg-ink-900">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-slate-600 dark:text-slate-400">
              AI-powered exam preparation for Pakistan&apos;s competitive and
              government job tests. Practice smarter, not harder.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Exams
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              {EXAMS.slice(0, 6).map((e) => (
                <li key={e.name}>{e.name}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Product
            </h4>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <a href="#features" className="hover:text-brand-600 dark:hover:text-white">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-brand-600 dark:hover:text-white">
                  Pricing
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-brand-600 dark:hover:text-white">
                  Log in
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-brand-600 dark:hover:text-white">
                  Get started
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-slate-200/70 pt-6 text-sm text-slate-500 dark:border-ink-800 dark:text-slate-400">
          © {new Date().getFullYear()} PrepGenius. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
