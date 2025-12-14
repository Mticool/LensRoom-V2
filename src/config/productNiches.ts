/**
 * Product Niches Configuration
 * Defines niche-specific copy guidelines and templates
 */

// ===== TYPES =====

export type ToneStyle = "strict" | "selling" | "premium" | "friendly" | "expert";
export type TemplateStyle = "minimal" | "premium" | "sale";

export interface BenefitTemplate {
  /** Placeholder text */
  placeholder: string;
  /** Example filled text */
  example: string;
  /** Icon suggestion (lucide icon name) */
  iconHint?: string;
}

export interface CopyHints {
  /** Words/phrases to use */
  prefer: string[];
  /** Words/phrases to avoid */
  avoid: string[];
  /** Call-to-action suggestions */
  ctaSuggestions: string[];
}

export interface ProductNiche {
  id: string;
  nameRu: string;
  nameEn: string;
  /** Emoji for UI */
  emoji: string;
  /** Recommended tone */
  tone: ToneStyle;
  /** Alternative acceptable tones */
  altTones: ToneStyle[];
  /** Benefit templates (3-5 bullets) */
  benefitTemplates: BenefitTemplate[];
  /** Copy writing hints */
  copyHints: CopyHints;
  /** Default template style */
  defaultTemplateStyle: TemplateStyle;
  /** Color palette suggestions (hex) */
  colorPalette: string[];
  /** Keywords for auto-detection */
  keywords: string[];
}

// ===== NICHES =====

export const PRODUCT_NICHES: ProductNiche[] = [
  {
    id: "cosmetics",
    nameRu: "Косметика",
    nameEn: "Cosmetics",
    emoji: "💄",
    tone: "premium",
    altTones: ["selling", "friendly"],
    benefitTemplates: [
      {
        placeholder: "Главный эффект",
        example: "Увлажняет 24 часа",
        iconHint: "droplet",
      },
      {
        placeholder: "Состав / ингредиенты",
        example: "С гиалуроновой кислотой",
        iconHint: "flask-conical",
      },
      {
        placeholder: "Результат / текстура",
        example: "Бархатистая кожа",
        iconHint: "sparkles",
      },
      {
        placeholder: "Объём / экономичность",
        example: "50 мл хватает на 3 месяца",
        iconHint: "clock",
      },
      {
        placeholder: "Сертификация / тесты",
        example: "Дерматологически протестировано",
        iconHint: "shield-check",
      },
    ],
    copyHints: {
      prefer: [
        "натуральный", "эффект", "результат", "уход", "сияние",
        "питание", "восстановление", "защита", "мягкость", "свежесть",
      ],
      avoid: [
        "дешёвый", "химия", "100% гарантия", "чудо-средство",
        "мгновенный результат навсегда", "лечит",
      ],
      ctaSuggestions: [
        "Попробуйте сейчас",
        "Ваша кожа скажет спасибо",
        "Почувствуйте разницу",
      ],
    },
    defaultTemplateStyle: "premium",
    colorPalette: ["#F5E6E0", "#E8D5CE", "#D4A59A", "#C9A0A0", "#A67B7B"],
    keywords: ["крем", "сыворотка", "маска", "шампунь", "бальзам", "помада", "тени", "тушь"],
  },

  {
    id: "clothing",
    nameRu: "Одежда",
    nameEn: "Clothing",
    emoji: "👕",
    tone: "selling",
    altTones: ["premium", "friendly"],
    benefitTemplates: [
      {
        placeholder: "Материал / ткань",
        example: "100% хлопок премиум",
        iconHint: "shirt",
      },
      {
        placeholder: "Комфорт / посадка",
        example: "Свободный крой oversize",
        iconHint: "move",
      },
      {
        placeholder: "Уход / практичность",
        example: "Не требует глажки",
        iconHint: "washing-machine",
      },
      {
        placeholder: "Универсальность",
        example: "Подходит для офиса и прогулок",
        iconHint: "repeat",
      },
      {
        placeholder: "Размерная сетка",
        example: "Размеры S–XXL",
        iconHint: "ruler",
      },
    ],
    copyHints: {
      prefer: [
        "комфорт", "стиль", "качество", "натуральный", "дышит",
        "универсальный", "трендовый", "базовый", "премиум",
      ],
      avoid: [
        "дешёвый", "как у всех", "обычный", "простой",
        "точная копия бренда", "реплика",
      ],
      ctaSuggestions: [
        "Добавьте в гардероб",
        "Ваш новый любимый look",
        "Комфорт на каждый день",
      ],
    },
    defaultTemplateStyle: "minimal",
    colorPalette: ["#2C3E50", "#34495E", "#95A5A6", "#ECF0F1", "#BDC3C7"],
    keywords: ["футболка", "джинсы", "платье", "куртка", "свитер", "брюки", "рубашка"],
  },

  {
    id: "electronics",
    nameRu: "Электроника",
    nameEn: "Electronics",
    emoji: "📱",
    tone: "expert",
    altTones: ["strict", "selling"],
    benefitTemplates: [
      {
        placeholder: "Главная характеристика",
        example: "Батарея 5000 mAh",
        iconHint: "battery-full",
      },
      {
        placeholder: "Производительность",
        example: "Процессор 8 ядер",
        iconHint: "cpu",
      },
      {
        placeholder: "Качество / разрешение",
        example: "4K UHD дисплей",
        iconHint: "monitor",
      },
      {
        placeholder: "Совместимость",
        example: "Работает с iOS и Android",
        iconHint: "plug",
      },
      {
        placeholder: "Гарантия / поддержка",
        example: "Гарантия 2 года",
        iconHint: "shield",
      },
    ],
    copyHints: {
      prefer: [
        "мощный", "быстрый", "надёжный", "технология", "характеристики",
        "производительность", "автономность", "совместимость",
      ],
      avoid: [
        "самый лучший в мире", "убийца iPhone", "дешёвая копия",
        "нереальная скидка", "только сегодня",
      ],
      ctaSuggestions: [
        "Оцените технологии",
        "Переходите на новый уровень",
        "Техника для жизни",
      ],
    },
    defaultTemplateStyle: "minimal",
    colorPalette: ["#1A1A2E", "#16213E", "#0F3460", "#E94560", "#533483"],
    keywords: ["телефон", "наушники", "зарядка", "кабель", "колонка", "часы", "планшет"],
  },

  {
    id: "home",
    nameRu: "Дом и быт",
    nameEn: "Home & Living",
    emoji: "🏠",
    tone: "friendly",
    altTones: ["selling", "premium"],
    benefitTemplates: [
      {
        placeholder: "Функциональность",
        example: "Экономит место на кухне",
        iconHint: "layout",
      },
      {
        placeholder: "Материал / качество",
        example: "Из натурального бамбука",
        iconHint: "tree-deciduous",
      },
      {
        placeholder: "Удобство использования",
        example: "Можно мыть в посудомойке",
        iconHint: "check-circle",
      },
      {
        placeholder: "Дизайн / стиль",
        example: "Впишется в любой интерьер",
        iconHint: "palette",
      },
      {
        placeholder: "Комплектация",
        example: "Набор из 6 предметов",
        iconHint: "package",
      },
    ],
    copyHints: {
      prefer: [
        "уют", "практичный", "стильный", "функциональный", "компактный",
        "экологичный", "долговечный", "универсальный",
      ],
      avoid: [
        "дешёвка", "пластик низкого качества", "как в IKEA",
        "хлипкий", "временное решение",
      ],
      ctaSuggestions: [
        "Создайте уют дома",
        "Порядок — это просто",
        "Для вашего комфорта",
      ],
    },
    defaultTemplateStyle: "minimal",
    colorPalette: ["#F5F5DC", "#DEB887", "#D2B48C", "#8B7355", "#556B2F"],
    keywords: ["органайзер", "полка", "контейнер", "посуда", "текстиль", "декор", "хранение"],
  },

  {
    id: "kids",
    nameRu: "Детские товары",
    nameEn: "Kids",
    emoji: "🧸",
    tone: "friendly",
    altTones: ["selling", "expert"],
    benefitTemplates: [
      {
        placeholder: "Безопасность",
        example: "Без острых углов",
        iconHint: "shield-check",
      },
      {
        placeholder: "Материалы",
        example: "Гипоаллергенные материалы",
        iconHint: "heart",
      },
      {
        placeholder: "Развитие / польза",
        example: "Развивает мелкую моторику",
        iconHint: "brain",
      },
      {
        placeholder: "Возраст",
        example: "Для детей от 3 лет",
        iconHint: "user",
      },
      {
        placeholder: "Сертификация",
        example: "Сертификат соответствия РФ",
        iconHint: "badge-check",
      },
    ],
    copyHints: {
      prefer: [
        "безопасный", "развивающий", "яркий", "прочный", "весёлый",
        "качественный", "экологичный", "сертифицированный",
      ],
      avoid: [
        "дешёвый китай", "пластик", "для маленьких",
        "хрупкий", "не сломается (если сломается)",
      ],
      ctaSuggestions: [
        "Радость для малыша",
        "Безопасно и весело",
        "Лучшее для детей",
      ],
    },
    defaultTemplateStyle: "sale",
    colorPalette: ["#FFE5B4", "#FFB6C1", "#87CEEB", "#98FB98", "#DDA0DD"],
    keywords: ["игрушка", "конструктор", "пазл", "детский", "развивающий", "коляска", "кроватка"],
  },
];

// ===== HELPERS =====

export function getNicheById(id: string): ProductNiche | undefined {
  return PRODUCT_NICHES.find(n => n.id === id);
}

export function getAllNiches(): ProductNiche[] {
  return PRODUCT_NICHES;
}

export function detectNicheByKeywords(text: string): ProductNiche | undefined {
  const lowerText = text.toLowerCase();
  
  for (const niche of PRODUCT_NICHES) {
    for (const keyword of niche.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return niche;
      }
    }
  }
  
  return undefined;
}

export function getBenefitPlaceholders(nicheId: string): string[] {
  const niche = getNicheById(nicheId);
  if (!niche) return [];
  return niche.benefitTemplates.map(b => b.placeholder);
}

export function getBenefitExamples(nicheId: string): string[] {
  const niche = getNicheById(nicheId);
  if (!niche) return [];
  return niche.benefitTemplates.map(b => b.example);
}

export function getToneLabel(tone: ToneStyle): string {
  const labels: Record<ToneStyle, string> = {
    strict: "Строгий",
    selling: "Продающий",
    premium: "Премиальный",
    friendly: "Дружелюбный",
    expert: "Экспертный",
  };
  return labels[tone] || tone;
}
