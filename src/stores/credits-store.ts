import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

interface CreditsState {
  balance: number;
  loading: boolean;
  error: string | null;
  fetchBalance: () => Promise<void>;
  addCredits: (amount: number) => void;
  deductCredits: (amount: number) => boolean;
  setBalance: (balance: number) => void;
}

export const useCreditsStore = create<CreditsState>((set, get) => ({
  balance: 0,
  loading: false,
  error: null,

  fetchBalance: async () => {
    set({ loading: true, error: null });
    try {
      // Use API endpoint that handles both Telegram and Supabase auth
      const response = await fetch('/api/auth/session', {
        credentials: 'include', // Important for cookie-based auth
      });
      
      if (!response.ok) {
        set({ balance: 0, loading: false });
        return;
      }

      const { user, balance } = await response.json();
      
      if (!user) {
        set({ balance: 0, loading: false });
        return;
      }

      set({ balance: balance || 0, loading: false });
    } catch (error) {
      console.error('Error fetching credits:', error);
      set({ error: 'Failed to fetch credits', balance: 0, loading: false });
    }
  },

  addCredits: (amount: number) => {
    set((state) => ({ balance: state.balance + amount }));
  },

  deductCredits: (amount: number) => {
    const { balance } = get();
    if (balance >= amount) {
      set({ balance: balance - amount });
      return true;
    }
    return false;
  },

  setBalance: (balance: number) => {
    set({ balance });
  },
}));


