#!/usr/bin/env node
/**
 * Minimal PM2 monitor for LensRoom.
 *
 * - Polls /api/health on localhost
 * - Logs errors
 * - Exits with non-zero after N consecutive failures (PM2 will restart)
 *
 * Env:
 * - MONITOR_TARGET_URL (default: http://127.0.0.1:3002/api/health)
 * - MONITOR_INTERVAL_MS (default: 60000)
 * - MONITOR_FAIL_THRESHOLD (default: 3)
 * - MONITOR_TIMEOUT_MS (default: 8000)
 */
/* eslint-disable no-console */

const targetUrl = process.env.MONITOR_TARGET_URL || 'http://127.0.0.1:3002/api/health';
const intervalMs = Number(process.env.MONITOR_INTERVAL_MS || 60000) || 60000;
const failThreshold = Number(process.env.MONITOR_FAIL_THRESHOLD || 3) || 3;
const timeoutMs = Number(process.env.MONITOR_TIMEOUT_MS || 8000) || 8000;

let consecutiveFailures = 0;

async function checkOnce() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'user-agent': 'lensroom-monitor/1.0' },
      signal: controller.signal,
    });

    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // keep null
    }

    const latencyMs = Date.now() - startedAt;
    const status = json?.status || 'unknown';

    const ok = res.ok && status === 'ok';
    if (ok) {
      if (consecutiveFailures > 0) {
        console.log(`[monitor] recovered (latency=${latencyMs}ms) url=${targetUrl}`);
      }
      consecutiveFailures = 0;
      return;
    }

    consecutiveFailures++;
    console.error(
      `[monitor] health not ok (#${consecutiveFailures}/${failThreshold}) http=${res.status} status=${status} latency=${latencyMs}ms url=${targetUrl} body=${text.slice(0, 300)}`
    );

    if (consecutiveFailures >= failThreshold) {
      console.error('[monitor] fail threshold reached, exiting for PM2 restart');
      process.exit(2);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    consecutiveFailures++;
    console.error(
      `[monitor] health check error (#${consecutiveFailures}/${failThreshold}) url=${targetUrl} error=${msg}`
    );
    if (consecutiveFailures >= failThreshold) {
      console.error('[monitor] fail threshold reached, exiting for PM2 restart');
      process.exit(2);
    }
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(
    `[monitor] starting url=${targetUrl} intervalMs=${intervalMs} failThreshold=${failThreshold} timeoutMs=${timeoutMs}`
  );
  // immediate check, then interval
  await checkOnce();
  // Keep process alive under PM2
  setInterval(checkOnce, intervalMs);
}

main().catch((e) => {
  console.error('[monitor] fatal:', e);
  process.exit(1);
});

