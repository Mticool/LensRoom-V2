import { Suspense } from "react";
import { StudioRuntime } from "@/components/studio/StudioRuntime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Loading() {
  return <div className="min-h-screen bg-[var(--bg)]" />;
}

export default function StudioPage() {
  return (
    <Suspense fallback={<Loading />}>
      {/* kind can be overridden via ?kind=photo|video */}
      <StudioRuntime defaultKind="photo" />
    </Suspense>
  );
}
