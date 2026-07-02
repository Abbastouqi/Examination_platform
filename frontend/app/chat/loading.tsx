import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl p-6">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-2 h-4 w-64" />

      <div className="mt-8 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <Skeleton className="hidden h-[28rem] w-full rounded-3xl lg:block" />
        <div className="space-y-4">
          <Skeleton className="h-16 w-3/4 rounded-2xl" />
          <Skeleton className="ml-auto h-16 w-2/3 rounded-2xl" />
          <Skeleton className="h-16 w-3/5 rounded-2xl" />
          <Skeleton className="mt-6 h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}
