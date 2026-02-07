type Entry<T> = {
  promise: Promise<T>;
  startedAt: number;
};

/**
 * Go-style singleflight: dedupe concurrent calls for the same key inside a single process.
 * Always clears the entry when the promise settles.
 */
export class SingleFlight {
  private readonly inFlight = new Map<string, Entry<any>>();

  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) return existing.promise as Promise<T>;

    const startedAt = Date.now();
    const p = (async () => {
      try {
        return await fn();
      } finally {
        // Only clear if this entry is still the current one (defensive).
        const cur = this.inFlight.get(key);
        if (cur && cur.startedAt === startedAt) this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, { promise: p, startedAt });
    return p;
  }
}

