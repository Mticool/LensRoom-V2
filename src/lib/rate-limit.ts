import { NextResponse } from "next/server";

type RateLimitConfig = {
  windowMs: number;
  max: number;
};

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // General generation limiter (per IP)
  generation: { windowMs: 60_000, max: 30 }, // 30 req/min
  // Generic API limiter fallback
  api: { windowMs: 60_000, max: 120 }, // 120 req/min
};

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function getClientIP(request: { headers?: Headers } | Request): string {
  const headers = (request as any)?.headers as Headers | undefined;
  const xff = headers?.get?.("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xrip = headers?.get?.("x-real-ip");
  if (xrip) return xrip.trim();
  return "unknown";
}

export function checkRateLimit(key: string, cfg: RateLimitConfig) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    const resetAt = now + cfg.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { success: true, remaining: cfg.max - 1, resetAt };
  }

  if (b.count >= cfg.max) {
    return { success: false, remaining: 0, resetAt: b.resetAt };
  }

  b.count += 1;
  buckets.set(key, b);
  return { success: true, remaining: cfg.max - b.count, resetAt: b.resetAt };
}

export function rateLimitResponse(result: { resetAt: number }) {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  const res = NextResponse.json(
    { error: "Слишком много запросов. Попробуйте позже." },
    { status: 429 }
  );
  res.headers.set("Retry-After", String(retryAfter));
  return res;
}


