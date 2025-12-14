// ===== STARS BALANCE MANAGEMENT =====
// Stub implementation using localStorage

const STORAGE_KEY = "lensroom_stars_balance";
const DEFAULT_BALANCE = 100; // Starting balance for new users

/**
 * Get current stars balance
 */
export function getStarsBalance(): number {
  if (typeof window === "undefined") return DEFAULT_BALANCE;
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) {
    // Initialize with default balance
    localStorage.setItem(STORAGE_KEY, String(DEFAULT_BALANCE));
    return DEFAULT_BALANCE;
  }
  
  return parseInt(stored, 10) || 0;
}

/**
 * Set stars balance (for admin/testing)
 */
export function setStarsBalance(balance: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(Math.max(0, Math.floor(balance))));
}

/**
 * Add stars to balance
 */
export function addStars(amount: number): number {
  const current = getStarsBalance();
  const newBalance = current + Math.floor(amount);
  setStarsBalance(newBalance);
  return newBalance;
}

/**
 * Deduct stars from balance
 * Returns true if successful, false if insufficient balance
 */
export function deductStars(amount: number): boolean {
  const current = getStarsBalance();
  const cost = Math.floor(amount);
  
  if (current < cost) {
    return false;
  }
  
  setStarsBalance(current - cost);
  return true;
}

/**
 * Check if user has enough stars
 */
export function hasEnoughStars(amount: number): boolean {
  return getStarsBalance() >= Math.floor(amount);
}

/**
 * Format stars for display
 */
export function formatStars(amount: number): string {
  return `⭐${Math.floor(amount)}`;
}
