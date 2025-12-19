/**
 * Telegram WebView utilities
 * Detects if app is running inside Telegram WebView and provides helpers
 */

/**
 * Detect if running in Telegram WebView
 */
export function detectWebView(): boolean {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent.toLowerCase();
  
  // Check for Telegram WebView indicators
  if (ua.includes("telegram")) return true;
  
  // Check for Telegram WebApp API
  if (typeof (window as any).Telegram !== "undefined" && 
      typeof (window as any).Telegram.WebApp !== "undefined") {
    return true;
  }

  return false;
}

/**
 * Open URL in external browser (outside Telegram WebView)
 * Falls back to window.open if not in Telegram
 */
export function openExternal(url: string): void {
  if (typeof window === "undefined") return;

  // Try Telegram WebApp API first
  if (typeof (window as any).Telegram !== "undefined" && 
      typeof (window as any).Telegram.WebApp?.openLink === "function") {
    try {
      (window as any).Telegram.WebApp.openLink(url);
      return;
    } catch (e) {
      console.warn("[Telegram WebView] openLink failed:", e);
    }
  }

  // Fallback to regular window.open
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Get Telegram WebApp instance (if available)
 */
export function getTelegramWebApp(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).Telegram?.WebApp || null;
}

/**
 * Expand Telegram WebView to full height
 */
export function expandWebView(): void {
  const webApp = getTelegramWebApp();
  if (webApp && typeof webApp.expand === "function") {
    try {
      webApp.expand();
    } catch (e) {
      console.warn("[Telegram WebView] expand failed:", e);
    }
  }
}

/**
 * Show/hide main button in Telegram WebView
 */
export function setMainButton(config: {
  text?: string;
  visible?: boolean;
  onClick?: () => void;
}): void {
  const webApp = getTelegramWebApp();
  if (!webApp?.MainButton) return;

  try {
    if (config.text) webApp.MainButton.setText(config.text);
    if (config.onClick) {
      webApp.MainButton.onClick(config.onClick);
    }
    if (config.visible !== undefined) {
      config.visible ? webApp.MainButton.show() : webApp.MainButton.hide();
    }
  } catch (e) {
    console.warn("[Telegram WebView] MainButton config failed:", e);
  }
}


