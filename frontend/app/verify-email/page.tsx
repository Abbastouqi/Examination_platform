"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GraduationCap, CheckCircle2, XCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button, Card, CardBody, LoadingBlock } from "@/components/ui";
import AuthBackground from "@/components/AuthBackground";

function AuthShell({
  title,
  children,
}: {
  title: string;
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
        <CardBody className="p-7 text-center">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <div className="mt-6">{children}</div>
        </CardBody>
      </Card>
    </div>
  );
}

type Status = "loading" | "success" | "error";

function VerifyEmailInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }

    (async () => {
      try {
        await api.post("/auth/verify-email", { token }, { noAuth: true });
        setStatus("success");
      } catch (err) {
        setStatus("error");
        setMessage(
          err instanceof ApiError ? err.message : "Something went wrong"
        );
      }
    })();
  }, [token]);

  if (status === "loading") {
    return (
      <AuthShell title="Verifying your email">
        <LoadingBlock label="Please wait..." />
      </AuthShell>
    );
  }

  if (status === "success") {
    return (
      <AuthShell title="Email verified">
        <div className="flex flex-col items-center gap-4">
          <CheckCircle2 className="h-12 w-12 text-accent-600" />
          <p className="text-sm text-slate-600">
            Your email has been verified. You can now log in.
          </p>
          <Link href="/login" className="w-full">
            <Button className="w-full">Go to login</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Verification failed">
      <div className="flex flex-col items-center gap-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <p className="text-sm text-slate-600">
          {message || "We couldn’t verify your email. The link may have expired."}
        </p>
        <Link href="/login" className="w-full">
          <Button variant="outline" className="w-full">
            Back to login
          </Button>
        </Link>
      </div>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailInner />
    </Suspense>
  );
}
