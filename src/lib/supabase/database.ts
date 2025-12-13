import { createClient } from './client';

// ===== TYPES =====

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  credits: number;
  plan: 'free' | 'creator' | 'business';
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  type: 'photo' | 'video' | 'product';
  model: string;
  prompt: string;
  negative_prompt: string | null;
  settings: Record<string, unknown>;
  result_urls: string[];
  credits_used: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'purchase' | 'generation' | 'bonus' | 'refund';
  description: string | null;
  generation_id: string | null;
  created_at: string;
}

// ===== PROFILE FUNCTIONS =====

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>
): Promise<Profile | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return data;
}

// ===== CREDITS FUNCTIONS =====

export async function getCredits(userId: string): Promise<number> {
  const profile = await getProfile(userId);
  return profile?.credits ?? 0;
}

export async function deductCredits(
  userId: string,
  amount: number,
  generationId?: string,
  description?: string
): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  // Check if user has enough credits
  const currentCredits = await getCredits(userId);
  if (currentCredits < amount) {
    console.error('Insufficient credits');
    return false;
  }

  // Start transaction
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      credits: currentCredits - amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Error deducting credits:', updateError);
    return false;
  }

  // Record transaction
  const { error: transactionError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: -amount,
      type: 'generation',
      description: description || 'Generation',
      generation_id: generationId,
    });

  if (transactionError) {
    console.error('Error recording transaction:', transactionError);
  }

  return true;
}

export async function addCredits(
  userId: string,
  amount: number,
  type: 'purchase' | 'bonus' | 'refund',
  description?: string
): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;

  const currentCredits = await getCredits(userId);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      credits: currentCredits + amount,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (updateError) {
    console.error('Error adding credits:', updateError);
    return false;
  }

  // Record transaction
  const { error: transactionError } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      amount: amount,
      type: type,
      description: description,
    });

  if (transactionError) {
    console.error('Error recording transaction:', transactionError);
  }

  return true;
}

// ===== GENERATION FUNCTIONS =====

export async function createGeneration(
  userId: string,
  data: {
    type: 'photo' | 'video' | 'product';
    model: string;
    prompt: string;
    negative_prompt?: string;
    settings?: Record<string, unknown>;
    credits_used: number;
  }
): Promise<Generation | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data: generation, error } = await supabase
    .from('generations')
    .insert({
      user_id: userId,
      ...data,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating generation:', error);
    return null;
  }

  return generation;
}

export async function updateGeneration(
  generationId: string,
  updates: Partial<Pick<Generation, 'status' | 'result_urls'>>
): Promise<Generation | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('generations')
    .update(updates)
    .eq('id', generationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating generation:', error);
    return null;
  }

  return data;
}

export async function getGenerations(
  userId: string,
  limit: number = 50
): Promise<Generation[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching generations:', error);
    return [];
  }

  return data || [];
}

export async function getGeneration(generationId: string): Promise<Generation | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('id', generationId)
    .single();

  if (error) {
    console.error('Error fetching generation:', error);
    return null;
  }

  return data;
}

// ===== TRANSACTION FUNCTIONS =====

export async function getTransactions(
  userId: string,
  limit: number = 50
): Promise<CreditTransaction[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return data || [];
}

