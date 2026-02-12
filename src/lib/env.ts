type EnvName = string;

const warned = new Set<EnvName>();

function isProductionDeployment(): boolean {
  return process.env.NODE_ENV === "production";
}

function warnOnce(message: string, key: EnvName) {
  if (warned.has(key)) return;
  warned.add(key);
   
  console.warn(message);
}

function optionalInternal(name: EnvName): string | undefined {
  const v = process.env[name];
  const t = typeof v === "string" ? v.trim() : "";
  return t ? t : undefined;
}

export const env = {
  optional(name: EnvName): string | undefined {
    return optionalInternal(name);
  },

  /**
   * In production deployments: throws if missing.
   * In dev: returns empty string and warns once (deduped).
   *
   * IMPORTANT: do not call this at module import time for optional integrations;
   * call it only when the integration is actually used.
   */
  required(name: EnvName, hint?: string): string {
    const v = process.env[name];
    const t = typeof v === "string" ? v.trim() : "";
    if (t) return t;

    if (isProductionDeployment()) {
      throw new Error(`[env] Missing required env var: ${name}${hint ? ` (${hint})` : ""}`);
    }

    warnOnce(
      `[env] Missing ${name}${hint ? ` (${hint})` : ""} — integration disabled in dev`,
      name
    );
    return "";
  },

  bool(name: EnvName): boolean {
    const v = optionalInternal(name);
    if (!v) return false;
    const s = v.toLowerCase();
    return s === "1" || s === "true" || s === "yes" || s === "on";
  },

  isKlingO3StandardEnabled(): boolean {
    return (
      env.bool("ENABLE_KLING_O3_STANDARD") ||
      env.bool("NEXT_PUBLIC_ENABLE_KLING_O3_STANDARD")
    );
  },
};


