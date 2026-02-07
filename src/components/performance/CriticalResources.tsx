"use client";

import { useEffect } from "react";

/**
 * Компонент для предзагрузки критических ресурсов
 * Добавляет <link rel="preload"> для важных ресурсов после первого рендера
 */
export function CriticalResources() {
  useEffect(() => {
    // Предзагрузка критических маршрутов
    const criticalRoutes = ["/create/studio?section=photo", "/pricing"];
    
    criticalRoutes.forEach((route) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = route;
      link.as = "document";
      document.head.appendChild(link);
    });

    // Предзагрузка API данных
    const prefetchData = async () => {
      try {
        // Предзагрузка стилей/эффектов для галереи
        fetch("/api/effects?featured=true", { 
          method: "GET",
          credentials: "include" 
        });
      } catch {
        // Игнорируем ошибки prefetch
      }
    };

    // Запускаем prefetch после idle
    if ("requestIdleCallback" in window) {
      requestIdleCallback(prefetchData);
    } else {
      setTimeout(prefetchData, 2000);
    }
  }, []);

  return null;
}

/**
 * Хелпер для preload изображений
 */
export function preloadImage(src: string, priority: "high" | "low" = "low") {
  if (typeof window === "undefined") return;
  
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = src;
  link.setAttribute("fetchpriority", priority);
  document.head.appendChild(link);
}

/**
 * Хелпер для preload модулей
 */
export function preloadModule(href: string) {
  if (typeof window === "undefined") return;
  
  const link = document.createElement("link");
  link.rel = "modulepreload";
  link.href = href;
  document.head.appendChild(link);
}

/**
 * Connection hints для критических доменов
 */
export function ConnectionHints() {
  return (
    <>
      {/* Supabase */}
      <link rel="preconnect" href="https://ndhykojwzazgmgvjaqgt.supabase.co" />
      <link rel="dns-prefetch" href="https://ndhykojwzazgmgvjaqgt.supabase.co" />
      
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    </>
  );
}
