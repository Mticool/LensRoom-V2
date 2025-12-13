import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';

interface CreditsState {
  balance: number;
  loading: boolean;
  fetchBalance: () => Promise<void>;
  deductCredits: (amount: number) => Promise<boolean>;
  addCredits: (amount: number) => Promise<void>;
  refundCredits: (amount: number) => Promise<void>;
}

export const useCreditsStore = create<CreditsState>((set, get) => ({
  balance: 0,
  loading: false,

  fetchBalance: async () => {
    set({ loading: true });
    try {
      const supabase = createClient();
      if (!supabase) {
        set({ balance: 0, loading: false });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        set({ balance: 0, loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('credits')
        .select('amount')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching credits:', error);
        set({ balance: 0 });
      } else {
        set({ balance: data?.amount || 0 });
      }
    } finally {
      set({ loading: false });
    }
  },

  deductCredits: async (amount: number) => {
    const { balance } = get();
    
    if (balance < amount) {
      return false; // Not enough credits
    }

    const supabase = createClient();
    if (!supabase) return false;

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;

    const newBalance = balance - amount;

    const { error } = await supabase
      .from('credits')
      .update({ 
        amount: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deducting credits:', error);
      return false;
    }

    set({ balance: newBalance });
    return true;
  },

  addCredits: async (amount: number) => {
    const { balance } = get();
    const supabase = createClient();
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    const newBalance = balance + amount;

    await supabase
      .from('credits')
      .update({ 
        amount: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    set({ balance: newBalance });
  },

  refundCredits: async (amount: number) => {
    const { addCredits } = get();
    await addCredits(amount);
  },
}));

