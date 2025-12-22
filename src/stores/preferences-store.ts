/**
 * User preferences store
 * Handles UI preferences like notification settings
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  // Notification preferences
  showSuccessNotifications: boolean;
  setShowSuccessNotifications: (value: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      // Default: show success notifications
      showSuccessNotifications: true,
      setShowSuccessNotifications: (value) => set({ showSuccessNotifications: value }),
    }),
    {
      name: 'lensroom-preferences',
    }
  )
);

