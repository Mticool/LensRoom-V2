// Exchange rate configuration
// Default USD to RUB rate - should be updated regularly

const DEFAULT_USD_RUB_RATE = 100; // 1 USD = 100 RUB (approximate)

export function getUsdRubRate(): number {
  // Can be enhanced to fetch from API or use environment variable
  return Number(process.env.USD_RUB_RATE) || DEFAULT_USD_RUB_RATE;
}

export function getStarRubRate(): number {
  // 1 star ≈ 2 RUB (Telegram Stars pricing)
  return Number(process.env.STAR_RUB_RATE) || 2;
}

