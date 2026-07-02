import Link from "next/link";
import { GraduationCap, Home, LayoutDashboard } from "lucide-react";
import { Button, Card, CardBody } from "@/components/ui";
import { TargetDoodle } from "@/components/Illustrations";

export default function NotFound() {
  return (
    <div className="doodle-bg flex min-h-screen items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md rounded-3xl shadow-soft animate-fade-up">
        <CardBody className="flex flex-col items-center p-8 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-accent-500 shadow-glow">
            <GraduationCap className="h-7 w-7 text-white" />
          </span>

          <div className="mt-6">
            <TargetDoodle className="mx-auto h-16 w-16 text-slate-900 dark:text-white" />
          </div>

          <p className="font-display mt-4 text-5xl font-extrabold tracking-tight text-gradient">
            404
          </p>
          <h1 className="font-display mt-2 text-xl font-bold text-slate-900 dark:text-white">
            Page not found
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            The page you&apos;re looking for doesn&apos;t exist or has moved.
          </p>

          <div className="mt-7 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/">
              <Button className="w-full rounded-full sm:w-auto">
                <Home className="h-4 w-4" /> Back home
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full rounded-full sm:w-auto">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
