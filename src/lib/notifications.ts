// Browser Notifications Utility for LensRoom

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}

class NotificationService {
  private permission: NotificationPermission = 'default';

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      this.permission = result;
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  canNotify(): boolean {
    return typeof window !== 'undefined' && 
           'Notification' in window && 
           this.permission === 'granted';
  }

  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }

  show(options: NotificationOptions): Notification | null {
    if (!this.canNotify()) {
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192.png',
        badge: '/icon-192.png',
        tag: options.tag || 'lensroom-notification',
        requireInteraction: false,
        silent: false,
      });

      if (options.onClick) {
        notification.onclick = () => {
          window.focus();
          options.onClick?.();
          notification.close();
        };
      }

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  // Convenience method for generation complete notification
  showGenerationComplete(mode: 'image' | 'video', prompt?: string) {
    const title = mode === 'video' ? '🎬 Видео готово!' : '🖼️ Изображение готово!';
    const body = prompt 
      ? `Ваше ${mode === 'video' ? 'видео' : 'изображение'} "${prompt.slice(0, 50)}${prompt.length > 50 ? '...' : ''}" успешно создано`
      : `Ваше ${mode === 'video' ? 'видео' : 'изображение'} успешно создано`;

    return this.show({
      title,
      body,
      tag: 'generation-complete',
      onClick: () => {
        // Focus the window/tab
        window.focus();
      },
    });
  }

  // Convenience method for generation error notification
  showGenerationError(errorMessage?: string) {
    return this.show({
      title: '❌ Ошибка генерации',
      body: errorMessage || 'Произошла ошибка при генерации. Попробуйте ещё раз.',
      tag: 'generation-error',
    });
  }
}

// Singleton instance
export const notificationService = new NotificationService();

// Hook for React components
import { useState, useEffect, useCallback } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(notificationService.isSupported());
    setPermission(notificationService.getPermission());
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await notificationService.requestPermission();
    setPermission(notificationService.getPermission());
    return granted;
  }, []);

  const showNotification = useCallback((options: NotificationOptions) => {
    return notificationService.show(options);
  }, []);

  const showGenerationComplete = useCallback((mode: 'image' | 'video', prompt?: string) => {
    return notificationService.showGenerationComplete(mode, prompt);
  }, []);

  const showGenerationError = useCallback((errorMessage?: string) => {
    return notificationService.showGenerationError(errorMessage);
  }, []);

  return {
    permission,
    isSupported,
    canNotify: permission === 'granted',
    requestPermission,
    showNotification,
    showGenerationComplete,
    showGenerationError,
  };
}

