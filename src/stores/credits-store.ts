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
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        set({ balance: 0, loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No credits record found, create one
          const { data: newCredits, error: insertError } = await supabase
            .from('credits')
            .insert({ user_id: user.id, balance: 100 })
            .select('balance')
            .single();

          if (insertError) throw insertError;
          set({ balance: newCredits?.balance || 100, loading: false });
          return;
        }
        throw error;
      }

      set({ balance: data?.balance || 0, loading: false });
    } catch (error) {
      console.error('Error fetching credits:', error);
      set({ error: 'Failed to fetch credits', loading: false });
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


