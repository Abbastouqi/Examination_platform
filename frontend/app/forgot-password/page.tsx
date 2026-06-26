"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import {
  Button,
  Card,
  CardBody,
  Input,
  ErrorAlert,
  SuccessAlert,
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email }, { noAuth: true });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we’ll send you a reset link."
    >
      {success ? (
        <div className="space-y-4">
          <SuccessAlert message="If that email exists, a reset link has been sent." />
          <Link href="/login" className="block">
            <Button variant="outline" className="w-full">
              Back to login
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <ErrorAlert message={error} />
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <Button type="submit" className="w-full" loading={loading}>
            Send reset link
          </Button>
          <p className="text-center text-sm text-slate-500">
            Remembered it?{" "}
            <Link
              href="/login"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Log in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
