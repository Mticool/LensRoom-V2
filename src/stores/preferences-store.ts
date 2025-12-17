/**
 * User preferences store
 * Handles UI preferences like notification settings
 */

import { create } from 'zustand';

interface PreferencesState {
  // Notification preferences
  showSuccessNotifications: boolean;
  setShowSuccessNotifications: (value: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>((set) => ({
  // Default: show success notifications
  showSuccessNotifications: true,
  setShowSuccessNotifications: (value) => set({ showSuccessNotifications: value }),
}));
