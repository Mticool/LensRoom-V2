/**
 * Draft Preset Flow
 * Handles Recreate/Remix functionality via localStorage
 */

const DRAFT_KEY = 'lensroom:presetDraft';

export interface DraftPreset {
  model: string;
  modelDisplayName?: string;
  type: 'photo' | 'video';
  params: Record<string, any>;
  prompt: string;
  sourceItem?: string; // ID of source item for tracking
  mode?: 'recreate' | 'remix'; // Track the intent
  timestamp?: number;
}

/**
 * Save draft preset to localStorage
 */
export function saveDraftPreset(draft: DraftPreset): void {
  if (typeof window === 'undefined') return;
  
  try {
    const draftWithTimestamp = {
      ...draft,
      timestamp: Date.now(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftWithTimestamp));
    console.log('[DraftPreset] Saved draft:', draft.mode, draft.model);
  } catch (error) {
    console.error('[DraftPreset] Error saving draft:', error);
  }
}

/**
 * Load draft preset from localStorage
 */
export function loadDraftPreset(): DraftPreset | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (!stored) return null;
    
    const draft = JSON.parse(stored) as DraftPreset;
    
    // Check if draft is not too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000;
    if (draft.timestamp && Date.now() - draft.timestamp > maxAge) {
      console.log('[DraftPreset] Draft expired, clearing');
      clearDraftPreset();
      return null;
    }
    
    console.log('[DraftPreset] Loaded draft:', draft.mode, draft.model);
    return draft;
  } catch (error) {
    console.error('[DraftPreset] Error loading draft:', error);
    return null;
  }
}

/**
 * Clear draft preset from localStorage
 */
export function clearDraftPreset(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(DRAFT_KEY);
    console.log('[DraftPreset] Cleared draft');
  } catch (error) {
    console.error('[DraftPreset] Error clearing draft:', error);
  }
}
