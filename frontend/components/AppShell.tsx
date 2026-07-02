"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Sparkles,
  BarChart3,
  CreditCard,
  KeyRound,
  User as UserIcon,
  Shield,
  Wallet,
  Menu,
  LogOut,
  GraduationCap,
  PenLine,
  History,
} from "lucide-react";
import { useAuth, RequireAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  admin?: boolean;
  group: "Main" | "Account" | "Admin";
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Main" },
  { href: "/chat", label: "AI Tutor", icon: MessageSquare, group: "Main" },
  { href: "/tests", label: "Mock Tests", icon: FileText, group: "Main" },
  { href: "/css", label: "CSS Prep", icon: PenLine, group: "Main" },
  { href: "/mcq", label: "MCQ Generator", icon: Sparkles, group: "Main" },
  { href: "/history", label: "History", icon: History, group: "Main" },
  { href: "/analytics", label: "Analytics", icon: BarChart3, group: "Main" },
  { href: "/billing", label: "Billing", icon: CreditCard, group: "Account" },
  { href: "/api-keys", label: "API Keys", icon: KeyRound, group: "Account" },
  { href: "/profile", label: "Profile", icon: UserIcon, group: "Account" },
  { href: "/admin", label: "Dashboard", icon: Shield, admin: true, group: "Admin" },
  { href: "/admin/payments", label: "Payments", icon: Wallet, admin: true, group: "Admin" },
];

const GROUPS: NavItem["group"][] = ["Main", "Account", "Admin"];

function NavLinks({
  onNavigate,
  isAdmin,
}: {
  onNavigate?: () => void;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-5 px-3">
      {GROUPS.map((group) => {
        const items = NAV.filter(
          (n) => n.group === group && (!n.admin || isAdmin)
        );
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {group}
            </p>
            <div className="flex flex-col gap-1">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    item.href !== "/admin" &&
                    pathname.startsWith(item.href)) ||
                  (item.href === "/admin" && pathname === "/admin");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent-400" />
                    )}
                    <Icon className="h-[18px] w-[18px]" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function SidebarContent({
  onNavigate,
  isAdmin,
}: {
  onNavigate?: () => void;
  isAdmin: boolean;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-gradient-to-b from-brand-950 via-brand-950 to-ink-950 py-5">
      {/* decorative glow */}
      <div className="orb -left-10 -top-10 h-40 w-40 bg-brand-500/30" />
      <div className="orb -bottom-10 right-0 h-40 w-40 bg-accent-500/20" />
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="relative mb-6 flex items-center gap-2.5 px-5"
      >
        <div className="rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 p-2 shadow-glow">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        <div className="leading-tight">
          <span className="block text-lg font-bold tracking-tight text-white">
            PrepGenius
          </span>
          <span className="block text-[10px] font-medium uppercase tracking-wider text-white/40">
            AI Exam Prep
          </span>
        </div>
      </Link>
      <div className="relative flex-1 overflow-y-auto scrollbar-thin">
        <NavLinks onNavigate={onNavigate} isAdmin={isAdmin} />
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  const initials = (user?.full_name || user?.email || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-cream dark:bg-ink-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">
        <SidebarContent isAdmin={isAdmin} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 animate-fade-in">
            <SidebarContent
              isAdmin={isAdmin}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-ink-800 dark:bg-ink-900/80 lg:px-8">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-800 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {user?.full_name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user?.email}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent-600 text-sm font-semibold text-white shadow-sm">
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-ink-800 dark:hover:text-red-400"
              title="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <Shell>{children}</Shell>
    </RequireAuth>
  );
}

// page header helper
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
