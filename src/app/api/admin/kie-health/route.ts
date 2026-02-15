import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/requireRole';
import { PROVIDER_CIRCUITS } from '@/lib/server/circuit-breaker';
import { getKieConfig } from '@/lib/api/kie-client';

/**
 * GET /api/admin/kie-health
 * Returns circuit breaker states + KIE API connectivity probe.
 */
export async function GET() {
  try {
    await requireRole('admin');

    const circuits = PROVIDER_CIRCUITS.getAllStates();
    const now = Date.now();

    // Annotate open circuits with remaining time
    const annotated: Record<string, any> = {};
    for (const [key, state] of Object.entries(circuits)) {
      annotated[key] = {
        ...state,
        isOpen: state.openUntilMs > now,
        remainingMs: Math.max(0, state.openUntilMs - now),
      };
    }

    // Probe KIE API connectivity (lightweight — query a dummy taskId)
    let kieProbe: any = { status: 'unknown' };
    try {
      const cfg = getKieConfig({ scope: 'video' });
      if (cfg.missing.length) {
        kieProbe = { status: 'not_configured', missing: cfg.missing };
      } else {
        const start = Date.now();
        const res = await fetch(`${cfg.baseUrl}/api/v1/jobs/recordInfo?taskId=health-check-probe`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfg.apiKey}`,
          },
          signal: AbortSignal.timeout(10_000),
        });
        const elapsed = Date.now() - start;
        const text = await res.text();
        let body: any;
        try { body = JSON.parse(text); } catch { body = text.substring(0, 200); }

        kieProbe = {
          status: res.ok || body?.code === 200 ? 'ok' : 'error',
          httpStatus: res.status,
          responseCode: body?.code,
          responseMsg: body?.message || body?.msg,
          latencyMs: elapsed,
          baseUrl: cfg.baseUrl,
          apiKeyPrefix: cfg.apiKey.substring(0, 8) + '...',
        };
      }
    } catch (e: any) {
      kieProbe = {
        status: 'unreachable',
        error: e?.message || String(e),
      };
    }

    return NextResponse.json({
      circuits: annotated,
      circuitCount: Object.keys(circuits).length,
      openCircuits: Object.values(annotated).filter((c: any) => c.isOpen).length,
      kieProbe,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.body?.error || e?.message || 'Unauthorized' },
      { status: e?.status || 500 }
    );
  }
}

/**
 * POST /api/admin/kie-health
 * Reset circuit breaker states.
 * Body: { action: 'reset', key?: string }
 */
export async function POST(request: NextRequest) {
  try {
    await requireRole('admin');

    const body = await request.json();
    const { action, key } = body;

    if (action === 'reset') {
      if (key) {
        PROVIDER_CIRCUITS.resetKey(key);
      } else {
        PROVIDER_CIRCUITS.resetAll();
      }
      return NextResponse.json({
        ok: true,
        action: key ? `reset key: ${key}` : 'reset all',
        circuits: PROVIDER_CIRCUITS.getAllStates(),
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.body?.error || e?.message || 'Unauthorized' },
      { status: e?.status || 500 }
    );
  }
}
