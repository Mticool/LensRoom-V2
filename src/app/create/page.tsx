"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Lazy load new generator component
const GeneratorV2 = dynamic(
  () => import("@/components/generator-v2/GeneratorV2").then(mod => ({ default: mod.GeneratorV2 })),
  {
    loading: () => <GeneratorLoading />,
    ssr: false,
  }
);

function GeneratorLoading() {
  return (
    <div className="min-h-screen bg-[#0F0F10] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-[#00D9FF] animate-spin mx-auto" />
        <p className="mt-4 text-[#A1A1AA] text-sm">Загрузка студии...</p>
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<GeneratorLoading />}>
      <GeneratorV2 defaultMode="image" />
    </Suspense>
  );
}
