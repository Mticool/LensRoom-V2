/* eslint-disable no-console */
// Smoke-test Nano Banana / Nano Banana Pro in LaoZhang mode.
//
// Usage:
//   node scripts/smoke/laozhang-banana-smoke.mjs
//   node scripts/smoke/laozhang-banana-smoke.mjs --live
//
// Live mode performs real API calls to https://api.laozhang.ai and may consume credits.

import { PHOTO_MODELS } from '../../src/config/models.ts';
import {
  getLaoZhangClient,
  getLaoZhangModelId,
  resolutionToLaoZhangSize,
  aspectRatioToLaoZhangSize,
} from '../../src/lib/api/laozhang-client.ts';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function findModel(id) {
  return PHOTO_MODELS.find((m) => m.id === id) || null;
}

const live = process.argv.includes('--live');

const nb = findModel('nano-banana');
const nbp = findModel('nano-banana-pro');

assert(nb, 'nano-banana missing in PHOTO_MODELS');
assert(nbp, 'nano-banana-pro missing in PHOTO_MODELS');

assert(nb.provider === 'laozhang', `nano-banana provider expected laozhang, got ${nb.provider}`);
assert(nbp.provider === 'laozhang', `nano-banana-pro provider expected laozhang, got ${nbp.provider}`);

// Mapping checks
assert(getLaoZhangModelId('nano-banana') === 'gemini-2.5-flash-image-preview', 'nano-banana model id mismatch');
assert(
  getLaoZhangModelId('nano-banana-pro', '1k_2k') === 'gemini-3-pro-image-preview-2k',
  'nano-banana-pro 2k model id mismatch'
);
assert(
  getLaoZhangModelId('nano-banana-pro', '4k') === 'gemini-3-pro-image-preview-4k',
  'nano-banana-pro 4k model id mismatch'
);

// Size helpers accept the extra ratios we expose in UI
const size1 = resolutionToLaoZhangSize('1k_2k', '9:16');
const size2 = resolutionToLaoZhangSize('4k', '21:9');
const size3 = aspectRatioToLaoZhangSize('4:5');
assert(/^\d+x\d+$/.test(size1), `invalid size1: ${size1}`);
assert(/^\d+x\d+$/.test(size2), `invalid size2: ${size2}`);
assert(/^\d+x\d+$/.test(size3), `invalid size3: ${size3}`);

console.log('[OK] Config + mapping checks passed:', {
  nb: { provider: nb.provider, apiId: nb.apiId },
  nbp: { provider: nbp.provider, apiId: nbp.apiId, qualityOptions: nbp.qualityOptions },
  samples: { size1, size2, size3 },
});

if (!live) process.exit(0);

// ===== Live calls (may spend credits) =====
const client = getLaoZhangClient();

// A tiny valid PNG as data URL (1x1).
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+WQZkAAAAASUVORK5CYII=';

async function run() {
  // Balance check (free)
  try {
    const bal = await client.getBalance();
    console.log('[OK] LaoZhang balance check:', bal);
  } catch (e) {
    console.error('[FAIL] LaoZhang balance check failed:', String(e?.message || e));
  }

  // T2I: nano-banana (flash)
  try {
    const model = getLaoZhangModelId('nano-banana');
    const res = await client.generateImage({
      model,
      prompt: 'test prompt (LensRoom smoke) - simple studio photo, sharp focus',
      n: 1,
      size: aspectRatioToLaoZhangSize('1:1'),
      response_format: 'url',
    });
    console.log('[OK] nano-banana t2i:', { hasUrl: !!res?.data?.[0]?.url });
  } catch (e) {
    console.error('[FAIL] nano-banana t2i:', String(e?.message || e));
  }

  // T2I: nano-banana-pro (2k)
  try {
    const model = getLaoZhangModelId('nano-banana-pro', '1k_2k');
    const res = await client.generateImage({
      model,
      prompt: 'test prompt (LensRoom smoke) - product photo on clean background',
      n: 1,
      size: resolutionToLaoZhangSize('1k_2k', '1:1'),
      response_format: 'url',
    });
    console.log('[OK] nano-banana-pro t2i:', { hasUrl: !!res?.data?.[0]?.url });
  } catch (e) {
    console.error('[FAIL] nano-banana-pro t2i:', String(e?.message || e));
  }

  // I2I: nano-banana-pro edit (uses /images/edits)
  try {
    const model = getLaoZhangModelId('nano-banana-pro', '1k_2k');
    const res = await client.editImage({
      model,
      prompt: 'make the image warmer and add subtle film grain',
      image: TINY_PNG,
      n: 1,
      size: resolutionToLaoZhangSize('1k_2k', '1:1'),
      response_format: 'url',
    });
    console.log('[OK] nano-banana-pro i2i:', { hasUrl: !!res?.data?.[0]?.url });
  } catch (e) {
    console.error('[FAIL] nano-banana-pro i2i:', String(e?.message || e));
  }
}

await run();

