import { describe, expect, it } from 'vitest';
import { isRetryableLaoZhangSubmissionError } from '@/lib/api/upstream-retry';

describe('isRetryableLaoZhangSubmissionError', () => {
  it('marks heavy load messages as retryable', () => {
    const err = new Error("Video API error: We're under heavy load, please try again later. (traceid: abc)");
    expect(isRetryableLaoZhangSubmissionError(err)).toBe(true);
  });

  it('marks explicit 429 as retryable', () => {
    const err = Object.assign(new Error('Too many requests'), { status: 429 });
    expect(isRetryableLaoZhangSubmissionError(err)).toBe(true);
  });

  it('does not mark validation errors as retryable', () => {
    const err = new Error('Video API error: invalid image format');
    expect(isRetryableLaoZhangSubmissionError(err)).toBe(false);
  });
});
