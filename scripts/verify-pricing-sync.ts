/**
 * Скрипт для проверки синхронизации тарифов во всех местах
 * Usage: npx tsx scripts/verify-pricing-sync.ts
 */

import { SUBSCRIPTION_TIERS, STAR_PACKS } from '../src/config/pricing';
import { SUBSCRIPTIONS } from '../src/lib/pricing-config';
import { SUBSCRIPTION_PLANS, CREDIT_PACKAGES } from '../src/lib/pricing/plans';

// Цвета для вывода
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

interface PricingCheck {
  location: string;
  id: string;
  price: number;
  stars: number;
  status: 'ok' | 'error';
  message?: string;
}

const results: PricingCheck[] = [];

console.log(`${colors.bold}${colors.blue}`);
console.log('═══════════════════════════════════════════════════════');
console.log('   ПРОВЕРКА СИНХРОНИЗАЦИИ ТАРИФОВ');
console.log('═══════════════════════════════════════════════════════');
console.log(colors.reset);

// Проверка подписок
console.log(`\n${colors.bold}📊 ПОДПИСКИ${colors.reset}\n`);

const sourceSubscriptions = SUBSCRIPTION_TIERS;

// Проверка SUBSCRIPTIONS (pricing-config.ts)
console.log(`${colors.yellow}Проверка: pricing-config.ts (SUBSCRIPTIONS)${colors.reset}`);
for (const source of sourceSubscriptions) {
  const mapped = SUBSCRIPTIONS.find((s) => s.id === source.id);
  
  if (!mapped) {
    results.push({
      location: 'pricing-config.ts',
      id: source.id,
      price: source.price,
      stars: source.stars,
      status: 'error',
      message: 'Отсутствует в SUBSCRIPTIONS',
    });
    console.log(`${colors.red}❌ ${source.name} (${source.id}) - ОТСУТСТВУЕТ${colors.reset}`);
    continue;
  }

  const priceMatch = mapped.price === source.price;
  const starsMatch = mapped.credits === source.stars;

  if (priceMatch && starsMatch) {
    results.push({
      location: 'pricing-config.ts',
      id: source.id,
      price: source.price,
      stars: source.stars,
      status: 'ok',
    });
    console.log(
      `${colors.green}✅ ${source.name} (${source.id})${colors.reset}\n` +
      `   Цена: ${source.price}₽, Звёзды: ${source.stars}⭐`
    );
  } else {
    results.push({
      location: 'pricing-config.ts',
      id: source.id,
      price: source.price,
      stars: source.stars,
      status: 'error',
      message: `Цена: ${source.price}₽ → ${mapped.price}₽, Звёзды: ${source.stars}⭐ → ${mapped.credits}⭐`,
    });
    console.log(
      `${colors.red}❌ ${source.name} (${source.id}) - РАСХОЖДЕНИЕ${colors.reset}\n` +
      `   Source: ${source.price}₽ / ${source.stars}⭐\n` +
      `   Mapped: ${mapped.price}₽ / ${mapped.credits}⭐`
    );
  }
}

console.log(`\n${colors.yellow}Проверка: pricing/plans.ts (SUBSCRIPTION_PLANS)${colors.reset}`);
for (const source of sourceSubscriptions) {
  const mapped = SUBSCRIPTION_PLANS.find((s) => s.id === source.id);
  
  if (!mapped) {
    results.push({
      location: 'pricing/plans.ts',
      id: source.id,
      price: source.price,
      stars: source.stars,
      status: 'error',
      message: 'Отсутствует в SUBSCRIPTION_PLANS',
    });
    console.log(`${colors.red}❌ ${source.name} (${source.id}) - ОТСУТСТВУЕТ${colors.reset}`);
    continue;
  }

  const priceMatch = mapped.price === source.price;
  const starsMatch = mapped.credits === source.stars;

  if (priceMatch && starsMatch) {
    results.push({
      location: 'pricing/plans.ts',
      id: source.id,
      price: source.price,
      stars: source.stars,
      status: 'ok',
    });
    console.log(
      `${colors.green}✅ ${source.name} (${source.id})${colors.reset}\n` +
      `   Цена: ${source.price}₽, Звёзды: ${source.stars}⭐`
    );
  } else {
    results.push({
      location: 'pricing/plans.ts',
      id: source.id,
      price: source.price,
      stars: source.stars,
      status: 'error',
      message: `Цена: ${source.price}₽ → ${mapped.price}₽, Звёзды: ${source.stars}⭐ → ${mapped.credits}⭐`,
    });
    console.log(
      `${colors.red}❌ ${source.name} (${source.id}) - РАСХОЖДЕНИЕ${colors.reset}\n` +
      `   Source: ${source.price}₽ / ${source.stars}⭐\n` +
      `   Mapped: ${mapped.price}₽ / ${mapped.credits}⭐`
    );
  }
}

// Проверка пакетов звёзд
console.log(`\n${colors.bold}📦 ПАКЕТЫ ЗВЁЗД${colors.reset}\n`);

const sourcePacks = STAR_PACKS;

console.log(`${colors.yellow}Проверка: pricing-config.ts (CREDIT_PACKAGES)${colors.reset}`);
for (const source of sourcePacks) {
  const totalStars = source.stars + (source.bonus || 0);
  const mapped = CREDIT_PACKAGES.find((p) => p.id === source.id);
  
  if (!mapped) {
    results.push({
      location: 'pricing-config.ts (packs)',
      id: source.id,
      price: source.price,
      stars: totalStars,
      status: 'error',
      message: 'Отсутствует в CREDIT_PACKAGES',
    });
    console.log(`${colors.red}❌ ${source.id} - ОТСУТСТВУЕТ${colors.reset}`);
    continue;
  }

  const priceMatch = mapped.price === source.price;
  const starsMatch = mapped.credits === totalStars;

  if (priceMatch && starsMatch) {
    results.push({
      location: 'pricing-config.ts (packs)',
      id: source.id,
      price: source.price,
      stars: totalStars,
      status: 'ok',
    });
    console.log(
      `${colors.green}✅ ${source.id.toUpperCase()}${colors.reset}\n` +
      `   Цена: ${source.price}₽, Звёзды: ${totalStars}⭐ (${source.stars}⭐ + ${source.bonus || 0}⭐ бонус)`
    );
  } else {
    results.push({
      location: 'pricing-config.ts (packs)',
      id: source.id,
      price: source.price,
      stars: totalStars,
      status: 'error',
      message: `Цена: ${source.price}₽ → ${mapped.price}₽, Звёзды: ${totalStars}⭐ → ${mapped.credits}⭐`,
    });
    console.log(
      `${colors.red}❌ ${source.id.toUpperCase()} - РАСХОЖДЕНИЕ${colors.reset}\n` +
      `   Source: ${source.price}₽ / ${totalStars}⭐\n` +
      `   Mapped: ${mapped.price}₽ / ${mapped.credits}⭐`
    );
  }
}

// Статистика
console.log(`\n${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
console.log(`${colors.bold}📊 СТАТИСТИКА${colors.reset}\n`);

const totalChecks = results.length;
const okCount = results.filter((r) => r.status === 'ok').length;
const errorCount = results.filter((r) => r.status === 'error').length;

console.log(`Всего проверок: ${colors.bold}${totalChecks}${colors.reset}`);
console.log(`${colors.green}✅ OK: ${okCount}${colors.reset}`);
console.log(`${colors.red}❌ Errors: ${errorCount}${colors.reset}`);

// Таблица актуальных тарифов
console.log(`\n${colors.bold}💰 АКТУАЛЬНЫЕ ТАРИФЫ${colors.reset}\n`);

console.log(`${colors.bold}Подписки:${colors.reset}`);
for (const tier of SUBSCRIPTION_TIERS) {
  const badge = tier.popular ? '⭐ ПОПУЛЯРНЫЙ' : '';
  console.log(`  ${colors.green}${tier.name}${colors.reset} - ${tier.price}₽/мес → ${tier.stars}⭐ ${badge}`);
}

console.log(`\n${colors.bold}Пакеты звёзд:${colors.reset}`);
for (const pack of STAR_PACKS) {
  const totalStars = pack.stars + (pack.bonus || 0);
  const bonusText = pack.bonus ? ` (+${pack.bonus}⭐ бонус)` : '';
  const badge = pack.popular ? '⭐ ПОПУЛЯРНЫЙ' : '';
  console.log(`  ${colors.green}${pack.id.toUpperCase()}${colors.reset} - ${pack.price}₽ → ${totalStars}⭐${bonusText} ${badge}`);
}

// Результат
console.log(`\n${colors.bold}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);

if (errorCount === 0) {
  console.log(`${colors.bold}${colors.green}✅ ВСЕ ТАРИФЫ СИНХРОНИЗИРОВАНЫ!${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.bold}${colors.red}❌ НАЙДЕНЫ РАСХОЖДЕНИЯ (${errorCount})${colors.reset}\n`);
  process.exit(1);
}
