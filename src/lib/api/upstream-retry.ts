import { FetchTimeoutError } from '@/lib/api/fetch-with-timeout';
import { CircuitOpenError } from '@/lib/server/circuit-breaker';

function extractErrorStatusCode(error: unknown): number | undefined {
  const status = Number((error as any)?.status);
  if (Number.isFinite(status) && status > 0) return status;

  const message = String((error as any)?.message || error || '');
  const statusMatch =
    message.match(/\bstatus(?:\s+code)?\s*[:=]?\s*(\d{3})\b/i) ||
    message.match(/\bresponded with a status of\s*(\d{3})\b/i);
  if (!statusMatch) return undefined;

  const parsed = Number(statusMatch[1]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function isRetryableLaoZhangSubmissionError(error: unknown): boolean {
  const status = extractErrorStatusCode(error);
  if (status && [408, 409, 425, 429, 500, 502, 503, 504].includes(status)) return true;
  if (error instanceof FetchTimeoutError || error instanceof CircuitOpenError) return true;

  const message = String((error as any)?.message || error || '').toLowerCase();
  return (
    /heavy load|try again later|temporarily unavailable|service unavailable|too many requests|rate limit|overload|busy/.test(message) ||
    /econnreset|etimedout|eai_again|enotfound|fetch failed|network error|gateway timeout|bad gateway|internal server error/.test(message)
  );
}

