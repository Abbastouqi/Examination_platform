"use client";

import React, { Suspense, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { setTokens } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { refreshUser } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const access = params.get("access_token");
    const refresh = params.get("refresh_token");

    if (!access) {
      router.replace("/login");
      return;
    }

    (async () => {
      setTokens(access, refresh ?? undefined);
      await refreshUser();
      router.replace("/dashboard");
    })();
  }, [params, router, refreshUser]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800 px-4">
      <Link href="/" className="inline-flex items-center gap-2 text-white">
        <GraduationCap className="h-7 w-7" />
        <span className="text-xl font-bold tracking-tight">PrepGenius</span>
      </Link>
      <div className="flex items-center gap-3 text-white">
        <Spinner className="text-white" />
        <span className="text-sm">Signing you in...</span>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-brand-800">
          <div className="flex items-center gap-3 text-white">
            <Spinner className="text-white" />
            <span className="text-sm">Signing you in...</span>
          </div>
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}
