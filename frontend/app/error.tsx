"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button, Card, CardBody } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console for debugging; never shown raw to users.
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="doodle-bg flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md rounded-3xl shadow-soft animate-fade-up">
        <CardBody className="flex flex-col items-center p-8 text-center">
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300">
            <AlertTriangle className="h-8 w-8" />
          </span>
          <h1 className="font-display mt-6 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            An unexpected error occurred. You can try again, or head back to
            your dashboard.
          </p>
          {error?.message && (
            <p className="mt-3 max-w-full truncate text-xs text-slate-400 dark:text-slate-500">
              {error.message}
            </p>
          )}
          <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => reset()} className="rounded-full">
              <RefreshCw className="h-4 w-4" /> Try again
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full rounded-full sm:w-auto">
                <LayoutDashboard className="h-4 w-4" /> Go to dashboard
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
