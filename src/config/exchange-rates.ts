/**
 * Exchange rates configuration
 * 
 * Default USD/RUB rate used for analytics and cost calculations.
 * Can be overridden via USD_RUB_RATE environment variable.
 * 
 * Note: This is used for internal analytics only, not for user-facing prices.
 * User prices are always shown in ⭐ (stars).
 */

// Default rate if not specified in env
const DEFAULT_USD_RUB_RATE = 100;

/**
 * Get current USD to RUB exchange rate
 * Reads from USD_RUB_RATE env variable or uses default
 */
export function getUsdRubRate(): number {
  const envRate = process.env.USD_RUB_RATE;
  if (envRate) {
    const parsed = parseFloat(envRate);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_USD_RUB_RATE;
}

/**
 * Convert USD to RUB
 */
export function usdToRub(usd: number): number {
  return usd * getUsdRubRate();
}

/**
 * Convert RUB to USD
 */
export function rubToUsd(rub: number): number {
  return rub / getUsdRubRate();
}





