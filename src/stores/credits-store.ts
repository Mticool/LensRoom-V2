import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// В приватном режиме localStorage может кидать — не ломаем первый рендер
const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(name) : null;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(name, value);
    } catch {
      // ignore
    }
  },
  removeItem: (name: string): void => {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

// Thresholds for low balance warnings
const LOW_BALANCE_THRESHOLDS = {
  critical: 5,   // Less than 5 stars - critical warning
  low: 20,       // Less than 20 stars - low warning
  medium: 50,    // Less than 50 stars - subtle reminder
};

interface CreditsState {
  balance: number;
  subscriptionStars: number; // Stars from subscription (expire monthly)
  packageStars: number;       // Stars from packages (never expire)
  loading: boolean;
  error: string | null;
  lastLowBalanceNotification: number | null; // timestamp
  lowBalanceThreshold: number;
  fetchBalance: () => Promise<void>;
  addCredits: (amount: number, type?: 'subscription' | 'package') => void;
  deductCredits: (amount: number) => boolean;
  setBalance: (balance: number, subscriptionStars?: number, packageStars?: number) => void;
  checkLowBalance: () => 'critical' | 'low' | 'medium' | null;
  shouldShowLowBalanceNotification: () => boolean;
  markLowBalanceNotified: () => void;
}

export const useCreditsStore = create<CreditsState>()(
  persist(
    (set, get) => ({
      balance: 0,
      subscriptionStars: 0,
      packageStars: 0,
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
            set({ balance: 0, subscriptionStars: 0, packageStars: 0, loading: false });
            return;
          }

          const { user, balance, subscriptionStars, packageStars } = await response.json();
          
          if (!user) {
            set({ balance: 0, subscriptionStars: 0, packageStars: 0, loading: false });
            return;
          }

          set({ 
            balance: balance || 0, 
            subscriptionStars: subscriptionStars || 0,
            packageStars: packageStars || 0,
            loading: false,
          });
        } catch (error) {
          console.error('Error fetching credits:', error);
          set({ error: 'Failed to fetch credits', balance: 0, subscriptionStars: 0, packageStars: 0, loading: false });
        }
      },

      addCredits: (amount: number, type: 'subscription' | 'package' = 'package') => {
        set((state) => {
          if (type === 'subscription') {
            return {
              subscriptionStars: state.subscriptionStars + amount,
              balance: state.balance + amount,
              lastLowBalanceNotification: null,
            };
          } else {
            return {
              packageStars: state.packageStars + amount,
              balance: state.balance + amount,
              lastLowBalanceNotification: null,
            };
          }
        });
      },

      deductCredits: (amount: number) => {
        const { balance, subscriptionStars, packageStars } = get();
        if (balance >= amount) {
          // Deduct from subscription first (use before they expire)
          const fromSubscription = Math.min(subscriptionStars, amount);
          const fromPackage = amount - fromSubscription;
          
          set({ 
            balance: balance - amount,
            subscriptionStars: subscriptionStars - fromSubscription,
            packageStars: packageStars - fromPackage,
          });
          return true;
        }
        return false;
      },

      setBalance: (balance: number, subscriptionStars?: number, packageStars?: number) => {
        set({ 
          balance,
          subscriptionStars: subscriptionStars ?? get().subscriptionStars,
          packageStars: packageStars ?? get().packageStars,
        });
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      storage: { getItem: safeStorage.getItem, setItem: safeStorage.setItem, removeItem: safeStorage.removeItem } as any,
      partialize: (state) => ({ 
        lastLowBalanceNotification: state.lastLowBalanceNotification,
      }),
    }
  )
);


