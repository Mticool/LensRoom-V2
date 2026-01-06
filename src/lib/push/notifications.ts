// Push Notifications Client
// Manages browser push notification subscriptions

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported';
  
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.warn('[Push] Push notifications not supported');
    return null;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn('[Push] VAPID_PUBLIC_KEY not configured');
    return null;
  }

  try {
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.log('[Push] Notification permission denied');
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      
      console.log('[Push] New subscription created');
    }

    // Send subscription to server
    await saveSubscriptionToServer(subscription);
    
    return subscription;
  } catch (error) {
    console.error('[Push] Subscription error:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      await removeSubscriptionFromServer(subscription);
      console.log('[Push] Unsubscribed');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Save subscription to server
 */
async function saveSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save subscription');
  }
}

/**
 * Remove subscription from server
 */
async function removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
    }),
  });
}

/**
 * Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

/**
 * Show a local notification (without push)
 */
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!isPushSupported()) return;
  
  const permission = getNotificationPermission();
  if (permission !== 'granted') return;

  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    ...options,
  });
}

// Типы уведомлений
export type NotificationType = 
  | 'generation_complete'
  | 'generation_failed'
  | 'credits_low'
  | 'subscription_expiring'
  | 'promo';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  image?: string;
  tag?: string;
}

