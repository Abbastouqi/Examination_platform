"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2, X } from "lucide-react";

// ---------------- Button ----------------
type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500 shadow-sm hover:shadow-md",
  secondary:
    "bg-accent-600 text-white hover:bg-accent-700 focus:ring-accent-500 shadow-sm hover:shadow-md",
  outline:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-brand-500 dark:border-ink-800 dark:bg-ink-900 dark:text-slate-200 dark:hover:bg-ink-800",
  ghost:
    "text-slate-700 hover:bg-slate-100 focus:ring-brand-500 dark:text-slate-300 dark:hover:bg-ink-800",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-ink-950 active:scale-[0.98]",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

// ---------------- Card ----------------
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-card transition-colors dark:border-ink-800 dark:bg-ink-900",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-ink-800">
      <div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

// ---------------- Inputs ----------------
const fieldBase =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-ink-800 dark:bg-ink-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-brand-500/30";
const labelBase =
  "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={labelBase}>
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            fieldBase,
            error && "border-red-400 focus:border-red-500 focus:ring-red-200",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, className, id, children, ...props }, ref) => {
    const sid = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={sid} className={labelBase}>
            {label}
          </label>
        )}
        <select id={sid} ref={ref} className={cn(fieldBase, className)} {...props}>
          {children}
        </select>
      </div>
    );
  }
);
Select.displayName = "Select";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, className, id, ...props }, ref) => {
    const tid = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={tid} className={labelBase}>
            {label}
          </label>
        )}
        <textarea id={tid} ref={ref} className={cn(fieldBase, className)} {...props} />
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

// ---------------- Badge ----------------
type BadgeColor =
  | "brand"
  | "accent"
  | "gray"
  | "red"
  | "amber"
  | "blue"
  | "green";

const badgeColors: Record<BadgeColor, string> = {
  brand:
    "bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/30",
  accent:
    "bg-accent-50 text-accent-700 ring-accent-200 dark:bg-accent-500/15 dark:text-accent-300 dark:ring-accent-500/30",
  gray:
    "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/30",
  red: "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  blue: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30",
  green:
    "bg-green-50 text-green-700 ring-green-200 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-500/30",
};

export function Badge({
  color = "gray",
  className,
  children,
}: {
  color?: BadgeColor;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        badgeColors[color],
        className
      )}
    >
      {children}
    </span>
  );
}

// ---------------- Spinner / Loading ----------------
export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn("h-5 w-5 animate-spin text-brand-600", className)} />
  );
}

export function LoadingBlock({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-slate-500 dark:text-slate-400">
      <Spinner />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "shimmer rounded-lg bg-slate-200/70 dark:bg-ink-800",
        className
      )}
    />
  );
}

// ---------------- StatCard ----------------
export function StatCard({
  label,
  value,
  icon: Icon,
  color = "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
  hint?: React.ReactNode;
}) {
  return (
    <Card className="hover:shadow-cardhover">
      <CardBody className="flex items-center gap-4">
        {Icon && (
          <div className={cn("rounded-xl p-3", color)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {value}
          </p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
            {label}
          </p>
          {hint && (
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              {hint}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

// ---------------- Modal ----------------
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "animate-scale-in relative z-10 w-full rounded-2xl bg-white shadow-xl dark:bg-ink-900 dark:ring-1 dark:ring-ink-800",
          sizes[size]
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-ink-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-ink-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-ink-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- EmptyState ----------------
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-ink-800 dark:bg-ink-900">
      {Icon && (
        <div className="mb-3 rounded-full bg-brand-50 p-3 dark:bg-brand-500/15">
          <Icon className="h-6 w-6 text-brand-600 dark:text-brand-300" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ---------------- UsageMeter ----------------
export function UsageMeter({
  label,
  used,
  limit,
  unlimited,
}: {
  label: string;
  used: number;
  limit: number;
  unlimited: boolean;
}) {
  const ratio = unlimited || !limit ? 0 : Math.min(used / limit, 1);
  const danger = ratio >= 0.9;
  const warn = ratio >= 0.7 && ratio < 0.9;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {label}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          {unlimited ? "Unlimited" : `${used} / ${limit}`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            unlimited
              ? "w-full bg-accent-500"
              : danger
              ? "bg-red-500"
              : warn
              ? "bg-amber-500"
              : "bg-brand-600"
          )}
          style={{ width: unlimited ? "100%" : `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

// ---------------- Alerts ----------------
export function ErrorAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      {message}
    </div>
  );
}

export function SuccessAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-accent-200 bg-accent-50 px-3 py-2 text-sm text-accent-800 dark:border-accent-500/30 dark:bg-accent-500/10 dark:text-accent-300">
      {message}
    </div>
  );
}
