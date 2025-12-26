"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Lazy load simple generator for testing
const GeneratorV2Simple = dynamic(
  () => import("@/components/generator-v2/GeneratorV2Simple").then(mod => ({ default: mod.GeneratorV2Simple })),
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
      <GeneratorV2Simple />
    </Suspense>
  );
}
