/**
 * Push Notifications Helper для LensRoom
 * Готовая структура для будущей интеграции с push-сервером
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/**
 * Проверяет поддержку push-уведомлений
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Запрашивает разрешение на уведомления
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    console.warn("[Push] Not supported in this browser");
    return "denied";
  }

  const permission = await Notification.requestPermission();
  console.log("[Push] Permission:", permission);
  return permission;
}

/**
 * Получает текущее разрешение
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (!isPushSupported()) return null;
  return Notification.permission;
}

/**
 * Подписывается на push-уведомления
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    console.log("[Push] Permission not granted");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Проверяем существующую подписку
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Создаём новую подписку
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log("[Push] New subscription created");

      // Отправляем подписку на сервер
      await sendSubscriptionToServer(subscription);
    }

    return subscription;
  } catch (error) {
    console.error("[Push] Subscription failed:", error);
    return null;
  }
}

/**
 * Отписывается от push-уведомлений
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();

      // Уведомляем сервер
      await removeSubscriptionFromServer(subscription);

      console.log("[Push] Unsubscribed successfully");
      return true;
    }
  } catch (error) {
    console.error("[Push] Unsubscribe failed:", error);
  }

  return false;
}

/**
 * Проверяет текущий статус подписки
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Показывает локальное уведомление (без сервера)
 */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!isPushSupported()) return;

  const permission = getNotificationPermission();
  if (permission !== "granted") return;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: "/icon-192x192.png",
      badge: "/badge-72x72.png",
      vibrate: [100, 50, 100],
      ...options,
    });
  } catch (error) {
    console.error("[Push] Local notification failed:", error);
  }
}

// === Серверные функции (заглушки) ===

/**
 * Отправляет подписку на сервер
 */
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  try {
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });
  } catch (error) {
    console.error("[Push] Failed to send subscription to server:", error);
  }
}

/**
 * Удаляет подписку с сервера
 */
async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    });
  } catch (error) {
    console.error("[Push] Failed to remove subscription from server:", error);
  }
}

// === Утилиты ===

/**
 * Конвертирует VAPID ключ в Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// === Типы уведомлений ===

export type NotificationType =
  | "generation_complete"
  | "generation_failed"
  | "new_feature"
  | "promotion"
  | "credits_low";

/**
 * Создаёт уведомление определённого типа
 */
export function createNotificationPayload(
  type: NotificationType,
  data?: Record<string, any>
): { title: string; body: string; url: string } {
  switch (type) {
    case "generation_complete":
      return {
        title: "✨ Генерация готова!",
        body: data?.title || "Ваше изображение готово к просмотру",
        url: "/library",
      };

    case "generation_failed":
      return {
        title: "⚠️ Ошибка генерации",
        body: "Попробуйте ещё раз или выберите другую модель",
        url: "/create",
      };

    case "new_feature":
      return {
        title: "🎉 Новая функция!",
        body: data?.message || "Посмотрите что нового в LensRoom",
        url: "/",
      };

    case "promotion":
      return {
        title: "🎁 Специальное предложение",
        body: data?.message || "Получите бонусные звёзды!",
        url: "/pricing",
      };

    case "credits_low":
      return {
        title: "💫 Заканчиваются звёзды",
        body: "Пополните баланс чтобы продолжить генерации",
        url: "/pricing",
      };

    default:
      return {
        title: "LensRoom",
        body: "У вас новое уведомление",
        url: "/",
      };
  }
}
