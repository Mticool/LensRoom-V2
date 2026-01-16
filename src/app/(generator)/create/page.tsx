"use client";

import { useEffect, useState } from "react";
import { GeneratorV2 } from "@/components/generator-v2/GeneratorV2";
import { MobileShowcase } from "@/components/mobile";

export default function CreatePage() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // На мобильных показываем витрину, на десктопе - генератор
  if (isMobile) {
    return <MobileShowcase />;
  }

  return <GeneratorV2 defaultMode="image" />;
}
