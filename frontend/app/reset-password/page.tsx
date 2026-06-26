"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import {
  Button,
  Card,
  CardBody,
  Input,
  ErrorAlert,
  SuccessAlert,
  LoadingBlock,
} from "@/components/ui";
import AuthBackground from "@/components/AuthBackground";

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <AuthBackground />
      <Link
        href="/"
        className="relative z-10 mb-6 inline-flex items-center gap-2 text-white drop-shadow"
      >
        <GraduationCap className="h-7 w-7" />
        <span className="text-xl font-bold tracking-tight">PrepGenius</span>
      </Link>
      <Card className="auth-card relative z-10 w-full max-w-md border-0">
        <CardBody className="p-7">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </CardBody>
      </Card>
    </div>
  );
}

function ResetPasswordInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Missing or invalid reset token.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await api.post(
        "/auth/reset-password",
        { token, new_password: password },
        { noAuth: true }
      );
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthShell title="Password reset">
        <div className="space-y-4">
          <SuccessAlert message="Your password has been reset successfully." />
          <Link href="/login" className="block">
            <Button className="w-full">Go to login</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a strong password you’ll remember."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorAlert message={error} />
        {!token && (
          <ErrorAlert message="No reset token found in the link. Please use the link from your email." />
        )}
        <Input
          label="New password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        <Input
          label="Confirm password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter new password"
        />
        <Button type="submit" className="w-full" loading={loading} disabled={!token}>
          Reset password
        </Button>
        <p className="text-center text-sm text-slate-500">
          <Link
            href="/login"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Back to login
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center">
          <AuthBackground />
          <div className="relative z-10 rounded-2xl bg-white/90 px-6 py-4 backdrop-blur-md">
            <LoadingBlock label="Loading..." />
          </div>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
