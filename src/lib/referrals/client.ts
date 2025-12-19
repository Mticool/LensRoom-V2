const STORAGE_KEY = "lr_referral_code";

export function captureReferralCodeFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const code = (url.searchParams.get("ref") || "").trim();
    if (!code) return null;
    localStorage.setItem(STORAGE_KEY, code);
    return code;
  } catch {
    return null;
  }
}

export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  const v = (localStorage.getItem(STORAGE_KEY) || "").trim();
  return v || null;
}

export function clearStoredReferralCode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}



