/**
 * Hook for detecting online/offline status
 */

import { useState, useEffect } from 'react';
import logger from '@/lib/logger';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => {
      logger.log('[useOnlineStatus] Connection restored');
      setIsOnline(true);
    };

    const handleOffline = () => {
      logger.warn('[useOnlineStatus] Connection lost');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
