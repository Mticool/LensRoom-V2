/**
 * Prompt Moderation & Filtering
 * Фильтрация промптов для обхода политики контента Google Veo и других моделей
 */

// ===== ЗАПРЕЩЁННЫЕ СЛОВА И ФРАЗЫ =====

const FORBIDDEN_WORDS = [
  // Violence
  'violence', 'violent', 'weapon', 'gun', 'knife', 'sword', 'blood', 'bloody',
  'violence', 'насилие', 'оружие', 'пистолет', 'нож', 'кровь',
  
  // Adult content
  'nude', 'naked', 'sex', 'sexual', 'porn', 'explicit',
  'обнажен', 'секс', 'порно', 'эротик',
  
  // Hate speech
  'hate', 'racist', 'discrimination',
  'ненависть', 'расизм', 'дискриминация',
  
  // Drugs
  'drug', 'cocaine', 'heroin', 'marijuana',
  'наркотик', 'кокаин', 'героин', 'марихуана',
  
  // Self-harm
  'suicide', 'self-harm', 'kill yourself',
  'суицид', 'самоубийство',
];

// ===== ФУНКЦИИ ФИЛЬТРАЦИИ =====

/**
 * Проверить промпт на запрещённые слова
 */
export function containsForbiddenContent(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  return FORBIDDEN_WORDS.some(word => lowerPrompt.includes(word.toLowerCase()));
}

/**
 * Очистить промпт от потенциально проблемных слов
 */
export function sanitizePrompt(prompt: string): string {
  let cleaned = prompt;
  
  // Удалить запрещённые слова
  FORBIDDEN_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });
  
  // Удалить множественные пробелы
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Заменить проблемные слова на безопасные синонимы
 */
export function replaceProblematicWords(prompt: string): string {
  const replacements: Record<string, string> = {
    // Violence → Action
    'violence': 'action',
    'violent': 'dynamic',
    'weapon': 'tool',
    'gun': 'device',
    'knife': 'tool',
    'blood': 'red',
    'bloody': 'red',
    
    // Adult → Professional
    'nude': 'professional',
    'naked': 'clothed',
    'explicit': 'artistic',
    
    // Hate → Neutral
    'hate': 'dislike',
    'racist': 'cultural',
  };
  
  let replaced = prompt;
  Object.entries(replacements).forEach(([bad, good]) => {
    const regex = new RegExp(`\\b${bad}\\b`, 'gi');
    replaced = replaced.replace(regex, good);
  });
  
  return replaced;
}

/**
 * Улучшить промпт для прохождения модерации
 */
export function improvePromptForModeration(prompt: string): string {
  // 1. Заменить проблемные слова
  let improved = replaceProblematicWords(prompt);
  
  // 2. Добавить безопасные модификаторы если нужно
  const safeModifiers = [
    'professional',
    'artistic',
    'cinematic',
    'family-friendly',
    'safe for work',
  ];
  
  // Если промпт короткий, добавить модификатор
  if (improved.length < 50 && !improved.includes('professional')) {
    improved = `${improved}, professional style`;
  }
  
  return improved.trim();
}

/**
 * Полная обработка промпта перед отправкой в Veo
 */
export function preparePromptForVeo(prompt: string, options?: {
  strict?: boolean; // Строгая фильтрация
  autoFix?: boolean; // Автоматически исправлять
}): {
  original: string;
  cleaned: string;
  needsModeration: boolean;
  warning?: string;
} {
  const original = prompt.trim();
  
  // Проверка на запрещённый контент
  const hasForbidden = containsForbiddenContent(original);
  
  if (hasForbidden && options?.strict) {
    return {
      original,
      cleaned: '',
      needsModeration: true,
      warning: 'Промпт содержит контент, который может нарушать политику контента. Пожалуйста, переформулируйте запрос.',
    };
  }
  
  // Автоматическое исправление
  let cleaned = original;
  if (hasForbidden && options?.autoFix) {
    cleaned = sanitizePrompt(original);
    if (cleaned.length < 10) {
      // Если после очистки осталось слишком мало, используем улучшенную версию
      cleaned = improvePromptForModeration(original);
    }
  } else if (hasForbidden) {
    // Только предупреждение
    return {
      original,
      cleaned: original,
      needsModeration: true,
      warning: 'Промпт может быть заблокирован. Рекомендуем переформулировать запрос.',
    };
  }
  
  return {
    original,
    cleaned,
    needsModeration: false,
  };
}

/**
 * Проверить промпт и вернуть безопасную версию
 */
export function getSafePrompt(prompt: string): string {
  const result = preparePromptForVeo(prompt, {
    strict: false,
    autoFix: true,
  });
  
  return result.cleaned || result.original;
}

