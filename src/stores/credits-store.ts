import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Thresholds for low balance warnings
const LOW_BALANCE_THRESHOLDS = {
  critical: 5,   // Less than 5 stars - critical warning
  low: 20,       // Less than 20 stars - low warning
  medium: 50,    // Less than 50 stars - subtle reminder
};

interface CreditsState {
  balance: number;
  loading: boolean;
  error: string | null;
  lastLowBalanceNotification: number | null; // timestamp
  lowBalanceThreshold: number;
  fetchBalance: () => Promise<void>;
  addCredits: (amount: number) => void;
  deductCredits: (amount: number) => boolean;
  setBalance: (balance: number) => void;
  checkLowBalance: () => 'critical' | 'low' | 'medium' | null;
  shouldShowLowBalanceNotification: () => boolean;
  markLowBalanceNotified: () => void;
}

export const useCreditsStore = create<CreditsState>()(
  persist(
    (set, get) => ({
      balance: 0,
      loading: false,
      error: null,
      lastLowBalanceNotification: null,
      lowBalanceThreshold: LOW_BALANCE_THRESHOLDS.low,

      fetchBalance: async () => {
        set({ loading: true, error: null });
        try {
          const response = await fetch('/api/auth/session', {
            credentials: 'include',
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
        set((state) => ({ 
          balance: state.balance + amount,
          // Reset notification if balance is topped up
          lastLowBalanceNotification: null,
        }));
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

      checkLowBalance: () => {
        const { balance } = get();
        if (balance <= LOW_BALANCE_THRESHOLDS.critical) return 'critical';
        if (balance <= LOW_BALANCE_THRESHOLDS.low) return 'low';
        if (balance <= LOW_BALANCE_THRESHOLDS.medium) return 'medium';
        return null;
      },

      shouldShowLowBalanceNotification: () => {
        const { balance, lastLowBalanceNotification } = get();
        
        // Don't show if balance is fine
        if (balance > LOW_BALANCE_THRESHOLDS.low) return false;
        
        // Don't show if we already notified in the last 6 hours
        if (lastLowBalanceNotification) {
          const hoursSinceNotification = (Date.now() - lastLowBalanceNotification) / (1000 * 60 * 60);
          if (hoursSinceNotification < 6) return false;
        }
        
        return true;
      },

      markLowBalanceNotified: () => {
        set({ lastLowBalanceNotification: Date.now() });
      },
    }),
    {
      name: 'lensroom-credits',
      partialize: (state) => ({ 
        lastLowBalanceNotification: state.lastLowBalanceNotification,
      }),
    }
  )
);


