/**
 * Telegram User State Manager
 *
 * Persistent state storage for Telegram bot users using Supabase.
 * Replaces in-memory Map with database-backed state.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';

// ========================================
// Types
// ========================================

export type FlowType =
  | 'photo_generation'
  | 'video_generation'
  | 'audio_generation'
  | 'tts_generation'
  | 'voice_clone'
  | 'lipsync'
  | 'payment'
  | 'settings'
  | null;

export interface ConversationState {
  currentFlow: FlowType;
  step: string | null;
  data: Record<string, any>;
  lastMessageId: number | null;
  expiresAt: string | null;
}

export interface TelegramUserSettings {
  telegramId: number;
  userId: string | null;

  // Preferences
  language: 'ru' | 'en';
  defaultPhotoModel: string;
  defaultVideoModel: string;
  defaultAspectRatio: string;
  defaultQuality: string;

  // Notifications
  notifyEnabled: boolean;
  notifySuccess: boolean;
  notifyError: boolean;
  notifyPromo: boolean;

  // Conversation state
  conversation: ConversationState;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ========================================
// In-memory cache (optional, for performance)
// ========================================

interface CacheEntry {
  state: TelegramUserSettings;
  expiresAt: number;
}

const stateCache = new Map<number, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(telegramId: number): TelegramUserSettings | null {
  const cached = stateCache.get(telegramId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.state;
  }
  stateCache.delete(telegramId);
  return null;
}

function setCache(telegramId: number, state: TelegramUserSettings): void {
  stateCache.set(telegramId, {
    state,
    expiresAt: Date.now() + CACHE_TTL,
  });
}

function invalidateCache(telegramId: number): void {
  stateCache.delete(telegramId);
}

// ========================================
// Default State
// ========================================

function getDefaultState(telegramId: number): TelegramUserSettings {
  return {
    telegramId,
    userId: null,
    language: 'ru',
    defaultPhotoModel: 'nano-banana',
    defaultVideoModel: 'veo-3.1-fast',
    defaultAspectRatio: '1:1',
    defaultQuality: 'balanced',
    notifyEnabled: true,
    notifySuccess: true,
    notifyError: true,
    notifyPromo: false,
    conversation: {
      currentFlow: null,
      step: null,
      data: {},
      lastMessageId: null,
      expiresAt: null,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ========================================
// Database Mappers
// ========================================

interface DbRow {
  id: string;
  telegram_id: number;
  user_id: string | null;
  language: string;
  default_photo_model: string;
  default_video_model: string;
  default_aspect_ratio: string;
  default_quality: string;
  notify_enabled: boolean;
  notify_success: boolean;
  notify_error: boolean;
  notify_promo: boolean;
  conversation_state: Record<string, any>;
  conversation_expires_at: string | null;
  last_message_id: number | null;
  created_at: string;
  updated_at: string;
}

function mapDbToState(row: DbRow): TelegramUserSettings {
  const convState = row.conversation_state || {};

  return {
    telegramId: row.telegram_id,
    userId: row.user_id,
    language: (row.language as 'ru' | 'en') || 'ru',
    defaultPhotoModel: row.default_photo_model || 'nano-banana',
    defaultVideoModel: row.default_video_model || 'veo-3.1-fast',
    defaultAspectRatio: row.default_aspect_ratio || '1:1',
    defaultQuality: row.default_quality || 'balanced',
    notifyEnabled: row.notify_enabled ?? true,
    notifySuccess: row.notify_success ?? true,
    notifyError: row.notify_error ?? true,
    notifyPromo: row.notify_promo ?? false,
    conversation: {
      currentFlow: convState.currentFlow || null,
      step: convState.step || null,
      data: convState.data || {},
      lastMessageId: row.last_message_id,
      expiresAt: row.conversation_expires_at,
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStateToDb(state: Partial<TelegramUserSettings>): Record<string, any> {
  const dbRow: Record<string, any> = {};

  if (state.language !== undefined) dbRow.language = state.language;
  if (state.defaultPhotoModel !== undefined) dbRow.default_photo_model = state.defaultPhotoModel;
  if (state.defaultVideoModel !== undefined) dbRow.default_video_model = state.defaultVideoModel;
  if (state.defaultAspectRatio !== undefined) dbRow.default_aspect_ratio = state.defaultAspectRatio;
  if (state.defaultQuality !== undefined) dbRow.default_quality = state.defaultQuality;
  if (state.notifyEnabled !== undefined) dbRow.notify_enabled = state.notifyEnabled;
  if (state.notifySuccess !== undefined) dbRow.notify_success = state.notifySuccess;
  if (state.notifyError !== undefined) dbRow.notify_error = state.notifyError;
  if (state.notifyPromo !== undefined) dbRow.notify_promo = state.notifyPromo;
  if (state.userId !== undefined) dbRow.user_id = state.userId;

  if (state.conversation) {
    dbRow.conversation_state = {
      currentFlow: state.conversation.currentFlow,
      step: state.conversation.step,
      data: state.conversation.data,
    };
    dbRow.conversation_expires_at = state.conversation.expiresAt;
    dbRow.last_message_id = state.conversation.lastMessageId;
  }

  return dbRow;
}

// ========================================
// Public API
// ========================================

/**
 * Get user state from database (with cache)
 */
export async function getUserState(telegramId: number): Promise<TelegramUserSettings> {
  // Check cache first
  const cached = getCached(telegramId);
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('telegram_user_settings')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (error || !data) {
    // Return default state (not yet saved to DB)
    const defaultState = getDefaultState(telegramId);
    return defaultState;
  }

  const state = mapDbToState(data as DbRow);
  setCache(telegramId, state);

  return state;
}

/**
 * Update user state in database
 */
export async function updateUserState(
  telegramId: number,
  updates: Partial<TelegramUserSettings>
): Promise<TelegramUserSettings> {
  const supabase = getSupabaseAdmin();

  const dbUpdates = mapStateToDb(updates);
  dbUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('telegram_user_settings')
    .upsert(
      {
        telegram_id: telegramId,
        ...dbUpdates,
      },
      { onConflict: 'telegram_id' }
    )
    .select()
    .single();

  if (error) {
    console.error('[UserState] Update error:', error);
    throw new Error('Failed to update user state');
  }

  const state = mapDbToState(data as DbRow);
  setCache(telegramId, state);

  return state;
}

/**
 * Start a new conversation flow
 */
export async function startFlow(
  telegramId: number,
  flow: FlowType,
  initialStep: string,
  initialData: Record<string, any> = {},
  expiresInMinutes: number = 30
): Promise<TelegramUserSettings> {
  return updateUserState(telegramId, {
    conversation: {
      currentFlow: flow,
      step: initialStep,
      data: initialData,
      lastMessageId: null,
      expiresAt: new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString(),
    },
  });
}

/**
 * Update conversation step and data
 */
export async function updateFlow(
  telegramId: number,
  step: string,
  data?: Record<string, any>,
  messageId?: number
): Promise<TelegramUserSettings> {
  const currentState = await getUserState(telegramId);

  return updateUserState(telegramId, {
    conversation: {
      ...currentState.conversation,
      step,
      data: data !== undefined ? { ...currentState.conversation.data, ...data } : currentState.conversation.data,
      lastMessageId: messageId ?? currentState.conversation.lastMessageId,
    },
  });
}

/**
 * Clear conversation state (end flow)
 */
export async function clearFlow(telegramId: number): Promise<TelegramUserSettings> {
  return updateUserState(telegramId, {
    conversation: {
      currentFlow: null,
      step: null,
      data: {},
      lastMessageId: null,
      expiresAt: null,
    },
  });
}

/**
 * Check if user has an active flow
 */
export async function hasActiveFlow(telegramId: number): Promise<boolean> {
  const state = await getUserState(telegramId);

  if (!state.conversation.currentFlow) {
    return false;
  }

  // Check expiration
  if (state.conversation.expiresAt) {
    if (new Date(state.conversation.expiresAt) < new Date()) {
      // Flow expired, clear it
      await clearFlow(telegramId);
      return false;
    }
  }

  return true;
}

/**
 * Get current flow info
 */
export async function getCurrentFlow(telegramId: number): Promise<{
  flow: FlowType;
  step: string | null;
  data: Record<string, any>;
} | null> {
  const hasFlow = await hasActiveFlow(telegramId);
  if (!hasFlow) {
    return null;
  }

  const state = await getUserState(telegramId);
  return {
    flow: state.conversation.currentFlow,
    step: state.conversation.step,
    data: state.conversation.data,
  };
}

/**
 * Link telegram user to auth user
 */
export async function linkUserAccount(
  telegramId: number,
  userId: string
): Promise<void> {
  await updateUserState(telegramId, { userId });
}

/**
 * Update user preferences
 */
export async function updatePreferences(
  telegramId: number,
  preferences: {
    defaultPhotoModel?: string;
    defaultVideoModel?: string;
    defaultAspectRatio?: string;
    defaultQuality?: string;
    language?: 'ru' | 'en';
  }
): Promise<TelegramUserSettings> {
  return updateUserState(telegramId, preferences);
}

/**
 * Update notification settings
 */
export async function updateNotifications(
  telegramId: number,
  settings: {
    notifyEnabled?: boolean;
    notifySuccess?: boolean;
    notifyError?: boolean;
    notifyPromo?: boolean;
  }
): Promise<TelegramUserSettings> {
  return updateUserState(telegramId, settings);
}

// ========================================
// Favorites Management
// ========================================

/**
 * Add generation to favorites
 */
export async function addToFavorites(
  telegramId: number,
  generationId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('telegram_favorites')
    .insert({
      telegram_id: telegramId,
      generation_id: generationId,
    })
    .single();

  if (error) {
    if (error.code === '23505') {
      // Already in favorites (unique constraint violation)
      return false;
    }
    console.error('[Favorites] Add error:', error);
    return false;
  }

  return true;
}

/**
 * Remove generation from favorites
 */
export async function removeFromFavorites(
  telegramId: number,
  generationId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { error } = await supabase
    .from('telegram_favorites')
    .delete()
    .eq('telegram_id', telegramId)
    .eq('generation_id', generationId);

  if (error) {
    console.error('[Favorites] Remove error:', error);
    return false;
  }

  return true;
}

/**
 * Check if generation is in favorites
 */
export async function isInFavorites(
  telegramId: number,
  generationId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('telegram_favorites')
    .select('id')
    .eq('telegram_id', telegramId)
    .eq('generation_id', generationId)
    .single();

  return !error && !!data;
}

/**
 * Get user's favorites with pagination
 */
export async function getFavorites(
  telegramId: number,
  limit: number = 10,
  offset: number = 0
): Promise<{ generationId: string; createdAt: string }[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from('telegram_favorites')
    .select('generation_id, created_at')
    .eq('telegram_id', telegramId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[Favorites] Get error:', error);
    return [];
  }

  return data.map((row: { generation_id: string; created_at: string }) => ({
    generationId: row.generation_id,
    createdAt: row.created_at,
  }));
}

/**
 * Count user's favorites
 */
export async function countFavorites(telegramId: number): Promise<number> {
  const supabase = getSupabaseAdmin();

  const { count, error } = await supabase
    .from('telegram_favorites')
    .select('*', { count: 'exact', head: true })
    .eq('telegram_id', telegramId);

  if (error) {
    console.error('[Favorites] Count error:', error);
    return 0;
  }

  return count || 0;
}
