"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  FileText,
  Sparkles,
  DollarSign,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  FolderOpen,
  FileStack,
  ScrollText,
  MessageSquare,
  CreditCard,
  Wallet,
} from "lucide-react";
import AppShell, { PageHeader } from "@/components/AppShell";
import { RequireAdmin } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import {
  Card,
  CardBody,
  CardHeader,
  LoadingBlock,
  ErrorAlert,
  EmptyState,
} from "@/components/ui";
import {
  UsersTrendChart,
  RevenueByPlanChart,
  RevenueTrendChart,
} from "./_charts";

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [overviewErr, setOverviewErr] = useState<string | null>(null);
  const [revenueErr, setRevenueErr] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [ov, rev] = await Promise.allSettled([
        api.get<any>("/admin/analytics/overview"),
        api.get<any>("/admin/analytics/revenue"),
      ]);
      if (!active) return;
      if (ov.status === "fulfilled") {
        setOverview(ov.value);
      } else {
        setOverviewErr(
          ov.reason instanceof ApiError
            ? ov.reason.message
            : "Failed to load analytics overview."
        );
      }
      if (rev.status === "fulfilled") {
        setRevenue(rev.value);
      } else {
        setRevenueErr(
          rev.reason instanceof ApiError
            ? rev.reason.message
            : "Failed to load revenue analytics."
        );
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Backend shape: overview = { users:{total,active,...}, content:{total_mcqs,total_tests,total_attempts,total_chats}, signups_trend:[] }
  const stats = [
    {
      label: "Total Users",
      value: overview?.users?.total ?? 0,
      icon: Users,
      color: "bg-brand-50 text-brand-600",
    },
    {
      label: "Active Users",
      value: overview?.users?.active ?? 0,
      icon: UserCheck,
      color: "bg-accent-50 text-accent-600",
    },
    {
      label: "Total Tests",
      value: overview?.content?.total_tests ?? 0,
      icon: FileText,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total MCQs",
      value: overview?.content?.total_mcqs ?? 0,
      icon: Sparkles,
      color: "bg-amber-50 text-amber-600",
    },
    {
      label: "Chat Sessions",
      value: overview?.content?.total_chats ?? 0,
      icon: MessageSquare,
      color: "bg-purple-50 text-purple-600",
    },
    {
      label: "Active Subscribers",
      value: revenue?.active_subscribers_total ?? 0,
      icon: CreditCard,
      color: "bg-teal-50 text-teal-600",
    },
    {
      label: "Total Revenue",
      value: `Rs ${revenue?.total_revenue ?? 0}`,
      icon: DollarSign,
      color: "bg-green-50 text-green-600",
    },
    {
      label: "MRR",
      value: `Rs ${revenue?.mrr_estimate ?? 0}`,
      icon: TrendingUp,
      color: "bg-brand-50 text-brand-600",
    },
  ];

  const quickLinks = [
    {
      href: "/admin/users",
      label: "Users",
      description: "Manage accounts & roles",
      icon: Users,
    },
    {
      href: "/admin/content",
      label: "Content",
      description: "Subjects & topics",
      icon: FolderOpen,
    },
    {
      href: "/admin/documents",
      label: "Documents",
      description: "Upload & index files",
      icon: FileStack,
    },
    {
      href: "/admin/payments",
      label: "Payments",
      description: "Approve subscriptions",
      icon: Wallet,
    },
    {
      href: "/admin/logs",
      label: "Logs",
      description: "System activity",
      icon: ScrollText,
    },
  ];

  const usersTrend = overview?.signups_trend ?? [];
  // revenue_by_plan is an object { plan: { revenue, count } } -> array for the chart.
  const byPlan = Object.entries(revenue?.revenue_by_plan ?? {}).map(
    ([plan, v]: [string, any]) => ({ plan, revenue: v?.revenue ?? 0 })
  );
  const revenueTrend = (revenue?.revenue_by_month ?? []).map((m: any) => ({
    date: m.month,
    revenue: m.revenue,
  }));

  return (
    <AppShell>
      <RequireAdmin>
        <PageHeader
          title="Admin Dashboard"
          description="Platform analytics and management."
        />

        {loading ? (
          <LoadingBlock label="Loading analytics…" />
        ) : (
          <div className="space-y-6">
            {(overviewErr || revenueErr) && (
              <div className="space-y-2">
                {overviewErr && <ErrorAlert message={overviewErr} />}
                {revenueErr && <ErrorAlert message={revenueErr} />}
              </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {stats.map((s) => {
                const Icon = s.icon;
                return (
                  <Card key={s.label}>
                    <CardBody className="flex items-center gap-4">
                      <div className={`rounded-xl p-3 ${s.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">
                          {s.value}
                        </p>
                        <p className="text-sm text-slate-500">{s.label}</p>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader title="New users" subtitle="Sign-ups over time" />
                <CardBody>
                  {usersTrend.length === 0 ? (
                    <EmptyState
                      icon={Users}
                      title="No data yet"
                      description="New user sign-up trend will appear here."
                    />
                  ) : (
                    <UsersTrendChart data={usersTrend} />
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Revenue by plan"
                  subtitle="Revenue grouped by subscription plan"
                />
                <CardBody>
                  {byPlan.length === 0 ? (
                    <EmptyState
                      icon={DollarSign}
                      title="No data yet"
                      description="Revenue by plan will appear here."
                    />
                  ) : (
                    <RevenueByPlanChart data={byPlan} />
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Revenue trend */}
            {revenueTrend.length > 0 && (
              <Card>
                <CardHeader
                  title="Revenue trend"
                  subtitle="Revenue over time"
                />
                <CardBody>
                  <RevenueTrendChart data={revenueTrend} />
                </CardBody>
              </Card>
            )}

            {/* Quick links */}
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <ShieldCheck className="h-4 w-4" /> Management
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {quickLinks.map((l) => {
                  const Icon = l.icon;
                  return (
                    <Link key={l.href} href={l.href}>
                      <Card className="transition-shadow hover:shadow-lg">
                        <CardBody className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-brand-50 p-3 text-brand-600">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {l.label}
                              </p>
                              <p className="text-xs text-slate-500">
                                {l.description}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                        </CardBody>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </RequireAdmin>
    </AppShell>
  );
}
