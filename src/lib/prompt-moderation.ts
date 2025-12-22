/**
 * Prompt Moderation & Filtering
 * Фильтрация промптов для обхода политики контента Google Veo
 */

const FORBIDDEN_WORDS = [
  'violence', 'violent', 'weapon', 'gun', 'knife', 'sword', 'blood', 'bloody',
  'fight', 'fighter', 'fighting', 'punch', 'punches', 'kick', 'kicks',
  'strike', 'strikes', 'attack', 'attacks', 'combat', 'battle',
  'nude', 'naked', 'sex', 'sexual', 'porn', 'explicit',
  'hate', 'racist', 'discrimination',
  'drug', 'cocaine', 'heroin', 'marijuana',
  'suicide', 'self-harm', 'kill yourself', 'murder', 'shoot', 'shooting',
];

export function containsForbiddenContent(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  return FORBIDDEN_WORDS.some(word => lowerPrompt.includes(word.toLowerCase()));
}

export function sanitizePrompt(prompt: string): string {
  let cleaned = prompt;
  FORBIDDEN_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  return cleaned.replace(/\s+/g, ' ').trim();
}

export function replaceProblematicWords(prompt: string): string {
  const replacements: Record<string, string> = {
    'violence': 'action', 'violent': 'dynamic', 'weapon': 'tool', 'gun': 'device',
    'knife': 'tool', 'blood': 'red', 'bloody': 'red',
    'fight': 'performance', 'fighter': 'performer', 'fighting': 'performing',
    'punch': 'movement', 'punches': 'movements', 'kick': 'motion', 'kicks': 'motions',
    'strike': 'move', 'strikes': 'moves', 'attack': 'advance', 'attacks': 'advances',
    'combat': 'choreography', 'battle': 'performance',
    'nude': 'professional', 'naked': 'clothed', 'explicit': 'artistic',
    'hate': 'dislike', 'racist': 'cultural',
    'murder': 'dramatic', 'shoot': 'point', 'shooting': 'pointing',
  };
  let replaced = prompt;
  Object.entries(replacements).forEach(([bad, good]) => {
    const regex = new RegExp(`\\b${bad}\\b`, 'gi');
    replaced = replaced.replace(regex, good);
  });
  return replaced;
}

export function preparePromptForVeo(prompt: string, options?: { strict?: boolean; autoFix?: boolean }): {
  original: string;
  cleaned: string;
  needsModeration: boolean;
  warning?: string;
} {
  const original = prompt.trim();
  const hasForbidden = containsForbiddenContent(original);
  
  if (hasForbidden && options?.strict) {
    return { original, cleaned: '', needsModeration: true, warning: 'Промпт содержит запрещённый контент.' };
  }
  
  let cleaned = original;
  if (hasForbidden && options?.autoFix) {
    // Сначала пробуем заменить слова (сохраняем смысл)
    cleaned = replaceProblematicWords(original);
    // Если все еще есть запрещенные слова, удаляем их
    if (containsForbiddenContent(cleaned)) {
      cleaned = sanitizePrompt(cleaned);
    }
  } else if (hasForbidden) {
    return { original, cleaned: original, needsModeration: true, warning: 'Промпт может быть заблокирован.' };
  }
  
  return { original, cleaned, needsModeration: hasForbidden };
}

export function getSafePrompt(prompt: string): string {
  const result = preparePromptForVeo(prompt, { strict: false, autoFix: true });
  return result.cleaned || result.original;
}

