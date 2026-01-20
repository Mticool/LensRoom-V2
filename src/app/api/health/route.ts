import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  const startedAt = Date.now();
  const timestamp = new Date().toISOString();

  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // DB / Supabase check (best-effort, fast query)
  try {
    const supabase = getSupabaseAdmin();
    const t0 = Date.now();
    // A lightweight query against a core table.
    const { error } = await supabase.from('generations').select('id').limit(1);
    const latencyMs = Date.now() - t0;
    if (error) {
      checks.supabase = { ok: false, latencyMs, error: error.message || String(error) };
    } else {
      checks.supabase = { ok: true, latencyMs };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    checks.supabase = { ok: false, error: msg };
  }

  const ok = Object.values(checks).every((c) => c.ok);
  const totalLatencyMs = Date.now() - startedAt;

  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      timestamp,
      latencyMs: totalLatencyMs,
      checks,
      runtime: {
        node: process.version,
        env: process.env.NODE_ENV || 'unknown',
        pid: process.pid,
        uptimeSec: Math.round(process.uptime()),
      },
    },
    { status: ok ? 200 : 503 }
  );
}






