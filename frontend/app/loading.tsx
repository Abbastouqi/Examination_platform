import { LoadingBlock } from "@/components/ui";

export default function Loading() {
  return (
    <div className="doodle-bg flex min-h-screen items-center justify-center">
      <LoadingBlock label="Loading…" />
    </div>
  );
}
