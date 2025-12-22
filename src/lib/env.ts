type EnvName = string;

const warned = new Set<EnvName>();

function isProductionDeployment(): boolean {
  // Per requirement: treat production when NODE_ENV=production OR Vercel env says production.
  const vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.VERCEL_ENV;
  return process.env.NODE_ENV === "production" || vercelEnv === "production";
}

function warnOnce(message: string, key: EnvName) {
  if (warned.has(key)) return;
  warned.add(key);
  // eslint-disable-next-line no-console
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
};




