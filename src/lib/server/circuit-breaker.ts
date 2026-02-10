export type CircuitBreakerOptions = {
  /** Failures within this window count towards opening the circuit. */
  failureWindowMs: number;
  /** Number of failures within the window required to open the circuit. */
  failureThreshold: number;
  /** How long the circuit stays open before allowing a probe request. */
  openDurationMs: number;
};

export type CircuitState = {
  openUntilMs: number;
  failures: number;
  lastFailureAtMs: number;
};

export class CircuitOpenError extends Error {
  constructor(
    public circuitKey: string,
    public openUntilMs: number
  ) {
    super(`Circuit is open for ${circuitKey}`);
    this.name = "CircuitOpenError";
  }
}

/**
 * Very small in-memory circuit breaker.
 * This protects the web process from stampeding a failing upstream.
 *
 * Note: state is per-process (PM2 worker). That's fine: it still reduces load
 * and keeps latency stable during provider incidents.
 */
export class CircuitBreaker {
  private states = new Map<string, CircuitState>();

  constructor(private opts: CircuitBreakerOptions) {}

  isOpen(key: string, nowMs: number = Date.now()): CircuitState | null {
    const s = this.states.get(key);
    if (!s) return null;
    if (s.openUntilMs > nowMs) return s;
    return null;
  }

  private reset(key: string) {
    this.states.delete(key);
  }

  recordSuccess(key: string) {
    // Any success closes the circuit immediately.
    this.reset(key);
  }

  recordFailure(key: string, nowMs: number = Date.now()) {
    const prev = this.states.get(key);
    const withinWindow =
      prev && prev.lastFailureAtMs && nowMs - prev.lastFailureAtMs <= this.opts.failureWindowMs;

    const failures = (withinWindow ? prev!.failures : 0) + 1;
    const next: CircuitState = {
      failures,
      lastFailureAtMs: nowMs,
      openUntilMs: 0,
    };

    if (failures >= this.opts.failureThreshold) {
      next.openUntilMs = nowMs + this.opts.openDurationMs;
    } else {
      next.openUntilMs = prev?.openUntilMs || 0;
    }

    this.states.set(key, next);
  }

  /**
   * Executes `fn` if circuit is closed; if open, throws CircuitOpenError.
   * The caller decides which errors should count as "failure" by calling
   * recordFailure/recordSuccess around this helper.
   */
  async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const open = this.isOpen(key);
    if (open) throw new CircuitOpenError(key, open.openUntilMs);
    return fn();
  }
}

export const PROVIDER_CIRCUITS = new CircuitBreaker({
  failureWindowMs: 30_000,
  failureThreshold: 5,
  openDurationMs: 60_000,
});

