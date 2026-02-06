import { getKieClient } from '../src/lib/api/kie-client';

async function main() {
  const allowRun = process.env.RUN_LIVE_SMOKE === '1';
  const allowCharge = process.env.SMOKE_ALLOW_CHARGE === '1';

  if (!allowRun || !allowCharge) {
    console.log('[live-smoke-video] Skipped. Set RUN_LIVE_SMOKE=1 and SMOKE_ALLOW_CHARGE=1 to run.');
    process.exit(0);
  }

  const model = process.env.SMOKE_MODEL || 'kling-2.6/text-to-video';
  const prompt = process.env.SMOKE_PROMPT || 'Smoke test: a calm ocean at sunrise';
  const duration = Number(process.env.SMOKE_DURATION || 5);
  const aspectRatio = process.env.SMOKE_ASPECT_RATIO || '16:9';

  const kie = getKieClient();

  console.log('[live-smoke-video] Request:', {
    model,
    duration,
    aspectRatio,
  });

  const response = await kie.generateVideo({
    model,
    provider: 'kie_market',
    prompt,
    mode: 't2v',
    duration,
    aspectRatio,
    sound: false,
  });

  console.log('[live-smoke-video] Response:', response);
  if (!response?.id) {
    throw new Error('No task id returned from KIE');
  }
}

main().catch((err) => {
  console.error('[live-smoke-video] Failed:', err);
  process.exit(1);
});
