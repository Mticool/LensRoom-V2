"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    // Регистрируем SW только в production
    if (process.env.NODE_ENV !== "production") {
      console.log("[SW] Skipping registration in development");
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        console.log("[SW] Registered successfully:", registration.scope);

        // Проверяем обновления
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              // Новая версия доступна
              console.log("[SW] New version available");
              
              // Можно показать уведомление пользователю
              if (window.confirm("Доступна новая версия. Обновить?")) {
                newWorker.postMessage({ type: "SKIP_WAITING" });
                window.location.reload();
              }
            }
          });
        });

        // Периодически проверяем обновления (каждый час)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

      } catch (error) {
        console.error("[SW] Registration failed:", error);
      }
    };

    // Регистрируем после загрузки страницы
    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
      return () => window.removeEventListener("load", registerSW);
    }
  }, []);

  return null;
}

// Хук для работы с SW
export function useServiceWorker() {
  const checkForUpdates = async () => {
    if (!("serviceWorker" in navigator)) return false;
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        return true;
      }
    } catch (error) {
      console.error("[SW] Update check failed:", error);
    }
    return false;
  };

  const unregister = async () => {
    if (!("serviceWorker" in navigator)) return false;
    
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.unregister();
        return true;
      }
    } catch (error) {
      console.error("[SW] Unregister failed:", error);
    }
    return false;
  };

  return { checkForUpdates, unregister };
}

