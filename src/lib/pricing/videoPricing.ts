export type PerSecondModelId =
  | 'kling-motion-control'
  | 'kling-ai-avatar'
  | 'kling-ai-avatar-standard'
  | 'kling-ai-avatar-pro'
  | 'infinitalk-480p'
  | 'infinitalk-720p';

export type MotionResolution = '720p' | '1080p';

export type BillingBreakdown = {
  rawSeconds: number;
  billableSeconds: number;
  creditsPerSecond: number;
  credits: number;
  stars: number;
};

const PER_SECOND_RATES = {
  motion: {
    '720p': 6,
    '1080p': 9,
  },
  avatar: {
    standard: 8,
    pro: 16,
  },
  infinitalk: {
    '480p': 3,
    '720p': 12,
  },
} as const;

export function calcBillableSeconds(opts: { rawSeconds: number; min: number; max: number }): number {
  const raw = Number(opts.rawSeconds || 0);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 0;
  }
  const rounded = Math.ceil(raw);
  return Math.min(opts.max, Math.max(opts.min, rounded));
}

export function calcStarsFromCredits(credits: number): number {
  // Current project conversion: 1 credit == 1 star.
  return Math.ceil(Number(credits || 0));
}

export function calcPerSecondCredits(opts: {
  modelId: PerSecondModelId;
  seconds: number;
  motionResolution?: MotionResolution;
  minSeconds?: number;
  maxSeconds?: number;
}): BillingBreakdown {
  const modelId = opts.modelId;
  let creditsPerSecond = 0;
  let minSeconds = Number.isFinite(opts.minSeconds) ? Number(opts.minSeconds) : 1;
  let maxSeconds = Number.isFinite(opts.maxSeconds) ? Number(opts.maxSeconds) : 60 * 60;

  if (modelId === 'kling-motion-control') {
    const resolution = opts.motionResolution || '720p';
    creditsPerSecond = PER_SECOND_RATES.motion[resolution];
    minSeconds = Number.isFinite(opts.minSeconds) ? Number(opts.minSeconds) : 3;
    maxSeconds = Number.isFinite(opts.maxSeconds) ? Number(opts.maxSeconds) : 30;
  } else if (modelId === 'kling-ai-avatar' || modelId === 'kling-ai-avatar-standard') {
    creditsPerSecond = PER_SECOND_RATES.avatar.standard;
    minSeconds = Number.isFinite(opts.minSeconds) ? Number(opts.minSeconds) : 1;
    maxSeconds = Number.isFinite(opts.maxSeconds) ? Number(opts.maxSeconds) : 15;
  } else if (modelId === 'kling-ai-avatar-pro') {
    creditsPerSecond = PER_SECOND_RATES.avatar.pro;
    minSeconds = Number.isFinite(opts.minSeconds) ? Number(opts.minSeconds) : 1;
    maxSeconds = Number.isFinite(opts.maxSeconds) ? Number(opts.maxSeconds) : 15;
  } else if (modelId === 'infinitalk-480p') {
    creditsPerSecond = PER_SECOND_RATES.infinitalk['480p'];
    minSeconds = Number.isFinite(opts.minSeconds) ? Number(opts.minSeconds) : 1;
    maxSeconds = Number.isFinite(opts.maxSeconds) ? Number(opts.maxSeconds) : 15;
  } else if (modelId === 'infinitalk-720p') {
    creditsPerSecond = PER_SECOND_RATES.infinitalk['720p'];
    minSeconds = Number.isFinite(opts.minSeconds) ? Number(opts.minSeconds) : 1;
    maxSeconds = Number.isFinite(opts.maxSeconds) ? Number(opts.maxSeconds) : 15;
  } else {
    throw new Error(`Unsupported per-second model: ${modelId}`);
  }

  const billableSeconds = calcBillableSeconds({
    rawSeconds: opts.seconds,
    min: minSeconds,
    max: maxSeconds,
  });
  const credits = Math.ceil(billableSeconds * creditsPerSecond);
  const stars = calcStarsFromCredits(credits);

  return {
    rawSeconds: Number(opts.seconds || 0),
    billableSeconds,
    creditsPerSecond,
    credits,
    stars,
  };
}

