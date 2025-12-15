// Pricing config for homepage display

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
  description: string;
  features: string[];
  popular?: boolean;
  badge?: string;
}

export const REGISTRATION_BONUS = 100;

export const SUBSCRIPTIONS: SubscriptionPlan[] = [
  {
    id: 'star',
    name: 'Star',
    price: 490,
    credits: 300,
    description: '300⭐ в месяц + 50⭐ при регистрации. Для старта и теста моделей: фото, первые ролики, обложки и эффекты.',
    badge: 'Попробовать',
    features: [
      'Доступ к фото и видео моделям',
      'Библиотека результатов',
      'Базовые настройки генерации',
      'Идеально для первого опыта',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 990,
    credits: 800,
    description: '800⭐ в месяц. Оптимальный тариф для регулярного контента и задач каждый день.',
    popular: true,
    badge: 'Лучший выбор',
    features: [
      'Всё из Star',
      'Больше монет на генерации',
      'Удобно для Reels/Shorts и рекламы',
      'Меньше ограничений — больше результата',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 2990,
    credits: 3000,
    description: '3000⭐ в месяц. Для бизнеса, маркетплейсов и производства контента потоком.',
    badge: 'Для объёма',
    features: [
      'Всё из Pro',
      'Максимум монет под большие задачи',
      'Подходит для команды/агентства/селлеров',
      'Комфортный объём на месяц',
    ],
  },
];

export const CREDIT_PACKAGES = [
  {
    id: 'mini',
    name: 'Mini',
    credits: 80,
    price: 199,
    description: 'Быстро докупить монеты, когда нужно доделать 1–2 задачи.',
    features: [
      'Без подписки',
      'Быстрое пополнение',
      'Для точечных задач',
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    credits: 400,
    price: 790,
    badge: 'Выгодно',
    description: 'Удобный пакет для серии попыток: сделал → проверил → докрутил.',
    features: [
      'Хорошо для пачки фото',
      'Хватает на несколько видео',
      'Оптимум цена/объём',
    ],
    popular: true,
  },
  {
    id: 'max',
    name: 'Max',
    credits: 1500,
    price: 2490,
    badge: 'Максимум',
    description: 'Для спринта: много генераций за короткий период. Максимум выгоды за ⭐.',
    features: [
      'Контент сразу на неделю/месяц',
      'Под кампании и запуски',
      'Самый большой объём',
    ],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    credits: 3500,
    price: 4990,
    badge: 'Для профи',
    description: '3500⭐. Максимальный объём для контента и рекламы: делайте много генераций без пауз и ограничений.',
    features: [
      'Лучшее соотношение объёма',
      'Под большие кампании и каталоги',
      'Идеально для видео и пачек фото',
    ],
  },
];

