"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GeneratorV2 } from "@/components/generator-v2/GeneratorV2";

export default function CreatePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      // Редирект на мобильную версию
      router.replace('/m');
    } else {
      setChecking(false);
    }
  }, [router]);

  // Пока проверяем - ничего не показываем
  if (checking) {
    return (
      <div className="min-h-screen bg-[#0F0F10] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#c6fe00]" />
      </div>
    );
  }

  // Desktop версия
  return <GeneratorV2 defaultMode="image" />;
}
