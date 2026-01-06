'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
} from '@/lib/push/notifications';

export type PushStatus = 'loading' | 'unsupported' | 'denied' | 'granted' | 'prompt';

interface UsePushNotificationsReturn {
  status: PushStatus;
  isSubscribed: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  canSubscribe: boolean;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [status, setStatus] = useState<PushStatus>('loading');
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Check initial state
  useEffect(() => {
    async function checkStatus() {
      if (!isPushSupported()) {
        setStatus('unsupported');
        return;
      }

      const permission = getNotificationPermission();
      if (permission === 'unsupported') {
        setStatus('unsupported');
        return;
      }

      setStatus(permission as PushStatus);

      // Check if already subscribed
      if (permission === 'granted') {
        const subscription = await getCurrentSubscription();
        setIsSubscribed(!!subscription);
      }
    }

    checkStatus();
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      const subscription = await subscribeToPush();
      if (subscription) {
        setIsSubscribed(true);
        setStatus('granted');
        return true;
      }
      
      // Update status based on permission
      const permission = getNotificationPermission();
      if (permission === 'denied') {
        setStatus('denied');
      }
      
      return false;
    } catch (error) {
      console.error('[Push Hook] Subscribe error:', error);
      return false;
    }
  }, []);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      const success = await unsubscribeFromPush();
      if (success) {
        setIsSubscribed(false);
      }
      return success;
    } catch (error) {
      console.error('[Push Hook] Unsubscribe error:', error);
      return false;
    }
  }, []);

  const canSubscribe = status === 'prompt' || (status === 'granted' && !isSubscribed);

  return {
    status,
    isSubscribed,
    subscribe,
    unsubscribe,
    canSubscribe,
  };
}







