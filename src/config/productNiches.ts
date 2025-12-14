/**
 * Product Niches Configuration
 * Strong presets for marketplace product cards
 */

// ===== TYPES =====

export type ToneStyle = "strict" | "selling" | "premium";

export interface SpecTemplate {
  label: string;
  valuePlaceholder: string;
}

export interface ProductNiche {
  id: string;
  labelRu: string;
  labelEn: string;
  emoji: string;
  
  /** Default copy tone */
  defaultTone: ToneStyle;
  
  /** 5 suggested benefits (clickable chips) */
  suggestedBenefits: string[];
  
  /** Specs with label + placeholder */
  suggestedSpecs: SpecTemplate[];
  
  /** 3 how-to steps */
  suggestedHowTo: string[];
  
  /** Forbidden claim patterns */
  avoidClaims: string[];
  
  /** 6 slide titles for pack */
  slideTitlesRu: [string, string, string, string, string, string];
  
  /** Color palette suggestions (hex) */
  colorPalette: string[];
  
  /** Keywords for auto-detection */
  keywords: string[];
}

// ===== SLIDE TITLES (default) =====

export const DEFAULT_SLIDE_TITLES: [string, string, string, string, string, string] = [
  "Главная",
  "Почему выбирают",
  "Характеристики",
  "Как использовать",
  "Комплектация",
  "Гарантия и доставка",
];

// ===== NICHES =====

export const PRODUCT_NICHES: ProductNiche[] = [
  {
    id: "cosmetics",
    labelRu: "Косметика",
    labelEn: "Cosmetics",
    emoji: "💄",
    defaultTone: "premium",
    
    suggestedBenefits: [
      "Увлажняет кожу до 24 часов",
      "Без парабенов и силиконов",
      "Дерматологически протестировано",
      "Подходит для чувствительной кожи",
      "Экономичный расход — хватает на 3 месяца",
    ],
    
    suggestedSpecs: [
      { label: "Объём", valuePlaceholder: "50 мл" },
      { label: "Тип кожи", valuePlaceholder: "Все типы" },
      { label: "Активные компоненты", valuePlaceholder: "Гиалуроновая кислота, витамин E" },
      { label: "Страна производства", valuePlaceholder: "Корея" },
      { label: "Срок годности", valuePlaceholder: "24 месяца" },
    ],
    
    suggestedHowTo: [
      "Нанесите небольшое количество на очищенную кожу",
      "Распределите лёгкими массажными движениями",
      "Используйте утром и вечером для лучшего результата",
    ],
    
    avoidClaims: [
      "лечит заболевания",
      "100% избавит от морщин",
      "мгновенный результат навсегда",
      "заменяет медицинские процедуры",
      "гарантированное омоложение",
    ],
    
    slideTitlesRu: [
      "Главная",
      "Почему выбирают",
      "Состав и действие",
      "Как применять",
      "Что в наборе",
      "Гарантия качества",
    ],
    
    colorPalette: ["#F5E6E0", "#E8D5CE", "#D4A59A", "#C9A0A0", "#A67B7B"],
    keywords: ["крем", "сыворотка", "маска", "шампунь", "бальзам", "помада", "тени", "тушь", "патчи"],
  },

  {
    id: "clothing",
    labelRu: "Одежда",
    labelEn: "Clothing",
    emoji: "👕",
    defaultTone: "selling",
    
    suggestedBenefits: [
      "100% натуральный хлопок премиум-качества",
      "Не садится и не деформируется после стирки",
      "Свободный крой — комфорт на весь день",
      "Универсальный стиль для офиса и прогулок",
      "Размерная сетка S–XXL в наличии",
    ],
    
    suggestedSpecs: [
      { label: "Состав", valuePlaceholder: "100% хлопок" },
      { label: "Размеры", valuePlaceholder: "S, M, L, XL, XXL" },
      { label: "Цвета", valuePlaceholder: "Чёрный, белый, серый" },
      { label: "Уход", valuePlaceholder: "Машинная стирка 40°" },
      { label: "Страна производства", valuePlaceholder: "Турция" },
    ],
    
    suggestedHowTo: [
      "Выберите размер по нашей таблице на фото",
      "Стирайте при температуре не выше 40°",
      "Гладьте с изнаночной стороны для сохранения принта",
    ],
    
    avoidClaims: [
      "точная копия бренда",
      "реплика люкс",
      "как оригинал",
      "не отличить от фирменного",
      "бренд за копейки",
    ],
    
    slideTitlesRu: [
      "Главная",
      "Почему выбирают",
      "Состав и размеры",
      "Уход за изделием",
      "Комплектация",
      "Доставка и возврат",
    ],
    
    colorPalette: ["#2C3E50", "#34495E", "#95A5A6", "#ECF0F1", "#BDC3C7"],
    keywords: ["футболка", "джинсы", "платье", "куртка", "свитер", "брюки", "рубашка", "худи", "костюм"],
  },

  {
    id: "electronics",
    labelRu: "Электроника",
    labelEn: "Electronics",
    emoji: "📱",
    defaultTone: "strict",
    
    suggestedBenefits: [
      "Ёмкий аккумулятор — до 12 часов работы",
      "Быстрая зарядка за 30 минут до 50%",
      "Совместимость с iOS и Android",
      "Шумоподавление для чистого звука",
      "Официальная гарантия производителя 12 месяцев",
    ],
    
    suggestedSpecs: [
      { label: "Ёмкость батареи", valuePlaceholder: "5000 mAh" },
      { label: "Время работы", valuePlaceholder: "До 12 часов" },
      { label: "Интерфейс", valuePlaceholder: "USB-C, Bluetooth 5.3" },
      { label: "Вес", valuePlaceholder: "150 г" },
      { label: "Гарантия", valuePlaceholder: "12 месяцев" },
    ],
    
    suggestedHowTo: [
      "Зарядите устройство перед первым использованием",
      "Подключите через Bluetooth или кабель",
      "Настройте через фирменное приложение",
    ],
    
    avoidClaims: [
      "убийца iPhone",
      "лучше чем Apple",
      "самый мощный в мире",
      "неубиваемый",
      "вечная батарея",
    ],
    
    slideTitlesRu: [
      "Главная",
      "Преимущества",
      "Технические характеристики",
      "Как подключить",
      "Комплект поставки",
      "Гарантия и сервис",
    ],
    
    colorPalette: ["#1A1A2E", "#16213E", "#0F3460", "#E94560", "#533483"],
    keywords: ["телефон", "наушники", "зарядка", "кабель", "колонка", "часы", "планшет", "powerbank", "адаптер"],
  },

  {
    id: "home",
    labelRu: "Дом и быт",
    labelEn: "Home & Living",
    emoji: "🏠",
    defaultTone: "selling",
    
    suggestedBenefits: [
      "Экономит место — компактное хранение",
      "Из экологичного бамбука / нержавеющей стали",
      "Можно мыть в посудомоечной машине",
      "Стильный дизайн впишется в любой интерьер",
      "Набор из 6 предметов — всё необходимое",
    ],
    
    suggestedSpecs: [
      { label: "Материал", valuePlaceholder: "Бамбук / нержавеющая сталь" },
      { label: "Размер", valuePlaceholder: "25×15×10 см" },
      { label: "Вес", valuePlaceholder: "350 г" },
      { label: "Цвет", valuePlaceholder: "Натуральный / белый" },
      { label: "Комплектация", valuePlaceholder: "6 предметов" },
    ],
    
    suggestedHowTo: [
      "Распакуйте и промойте перед первым использованием",
      "Храните в сухом месте",
      "Мойте вручную или в посудомоечной машине",
    ],
    
    avoidClaims: [
      "неубиваемый",
      "вечный",
      "как в IKEA но лучше",
      "премиум за копейки",
      "люксовое качество",
    ],
    
    slideTitlesRu: [
      "Главная",
      "Почему выбирают",
      "Размеры и материалы",
      "Как использовать",
      "Что в комплекте",
      "Доставка и гарантия",
    ],
    
    colorPalette: ["#F5F5DC", "#DEB887", "#D2B48C", "#8B7355", "#556B2F"],
    keywords: ["органайзер", "полка", "контейнер", "посуда", "текстиль", "декор", "хранение", "корзина", "набор"],
  },

  {
    id: "kids",
    labelRu: "Детские товары",
    labelEn: "Kids",
    emoji: "🧸",
    defaultTone: "selling",
    
    suggestedBenefits: [
      "Безопасно — без острых углов и мелких деталей",
      "Гипоаллергенные материалы, сертификат РФ",
      "Развивает мелкую моторику и логику",
      "Подходит для детей от 3 лет",
      "Яркие цвета привлекают внимание ребёнка",
    ],
    
    suggestedSpecs: [
      { label: "Возраст", valuePlaceholder: "3+" },
      { label: "Материал", valuePlaceholder: "ABS-пластик / дерево" },
      { label: "Размер", valuePlaceholder: "20×15×10 см" },
      { label: "Вес", valuePlaceholder: "200 г" },
      { label: "Сертификация", valuePlaceholder: "ЕАС, ГОСТ" },
    ],
    
    suggestedHowTo: [
      "Распакуйте игрушку и удалите упаковочные материалы",
      "Покажите ребёнку, как пользоваться",
      "Храните в сухом месте, регулярно протирайте",
    ],
    
    avoidClaims: [
      "100% безопасно",
      "гарантированно развивает гениальность",
      "заменяет занятия с логопедом",
      "научит читать за неделю",
      "абсолютно неломаемый",
    ],
    
    slideTitlesRu: [
      "Главная",
      "Почему родители выбирают",
      "Безопасность и материалы",
      "Как играть",
      "Что в коробке",
      "Гарантия и доставка",
    ],
    
    colorPalette: ["#FFE5B4", "#FFB6C1", "#87CEEB", "#98FB98", "#DDA0DD"],
    keywords: ["игрушка", "конструктор", "пазл", "детский", "развивающий", "коляска", "кроватка", "погремушка"],
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

export function getSuggestedBenefits(nicheId: string): string[] {
  const niche = getNicheById(nicheId);
  return niche?.suggestedBenefits ?? [];
}

export function getSuggestedSpecs(nicheId: string): SpecTemplate[] {
  const niche = getNicheById(nicheId);
  return niche?.suggestedSpecs ?? [];
}

export function getSuggestedHowTo(nicheId: string): string[] {
  const niche = getNicheById(nicheId);
  return niche?.suggestedHowTo ?? [];
}

export function getAvoidClaims(nicheId: string): string[] {
  const niche = getNicheById(nicheId);
  return niche?.avoidClaims ?? [];
}

export function getSlideTitles(nicheId: string | null): string[] {
  if (!nicheId) return [...DEFAULT_SLIDE_TITLES];
  const niche = getNicheById(nicheId);
  return niche?.slideTitlesRu ? [...niche.slideTitlesRu] : [...DEFAULT_SLIDE_TITLES];
}

export function getToneLabel(tone: ToneStyle): string {
  const labels: Record<ToneStyle, string> = {
    strict: "Строгий",
    selling: "Продающий",
    premium: "Премиальный",
  };
  return labels[tone] || tone;
}

export function getToneDescription(tone: ToneStyle): string {
  const descriptions: Record<ToneStyle, string> = {
    strict: "Факты, характеристики, без эмоций",
    selling: "Выгоды, призывы к действию, эмоции",
    premium: "Изысканность, качество, статус",
  };
  return descriptions[tone] || "";
}

