export class SemaphoreTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SemaphoreTimeoutError";
  }
}

type AcquireOptions = {
  timeoutMs?: number;
  label?: string;
};

/**
 * Simple async semaphore for limiting concurrent work in a single Node.js process.
 * Intended for protecting external provider calls so one stuck upstream doesn't
 * cause unbounded in-flight requests (and memory/CPU pressure).
 */
export class Semaphore {
  private readonly max: number;
  private active = 0;
  private readonly queue: Array<{
    resolve: (release: () => void) => void;
    reject: (err: Error) => void;
    label?: string;
  }> = [];
  private readonly name: string;

  constructor(max: number, name: string) {
    const n = Number(max);
    if (!Number.isFinite(n) || n <= 0) throw new Error(`Semaphore(${name}) max must be > 0`);
    this.max = Math.floor(n);
    this.name = name;
  }

  get size() {
    return this.max;
  }

  get inFlight() {
    return this.active;
  }

  async acquire(options: AcquireOptions = {}): Promise<() => void> {
    const timeoutMs = options.timeoutMs ?? 10_000;
    const label = options.label;

    if (this.active < this.max) {
      this.active++;
      return this.makeRelease();
    }

    return new Promise<() => void>((resolve, reject) => {
      let done = false;
      let entryRef:
        | {
            resolve: (release: () => void) => void;
            reject: (err: Error) => void;
            label?: string;
          }
        | null = null;

      const wrappedResolve = (release: () => void) => {
        if (done) return;
        done = true;
        resolve(release);
      };
      const wrappedReject = (err: Error) => {
        if (done) return;
        done = true;
        reject(err);
      };

      entryRef = { resolve: wrappedResolve, reject: wrappedReject, label };
      this.queue.push(entryRef);

      const timer =
        timeoutMs > 0
          ? setTimeout(() => {
              if (done) return;
              done = true;
              // Remove from queue if still waiting.
              const idx = entryRef ? this.queue.indexOf(entryRef) : -1;
              if (idx >= 0) this.queue.splice(idx, 1);
              reject(
                new SemaphoreTimeoutError(
                  `Semaphore(${this.name}) acquire timeout after ${timeoutMs}ms${label ? ` (${label})` : ""}`
                )
              );
            }, timeoutMs)
          : null;

      // Ensure timers are cleared once settled (resolve/reject).
      const clear = () => {
        if (timer) clearTimeout(timer);
      };
      // Wrap the original resolve/reject so any completion clears the timer.
      const origResolve = wrappedResolve;
      const origReject = wrappedReject;
      entryRef.resolve = (release) => {
        clear();
        origResolve(release);
      };
      entryRef.reject = (err) => {
        clear();
        origReject(err);
      };
    });
  }

  private makeRelease(): () => void {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.active = Math.max(0, this.active - 1);
      this.pump();
    };
  }

  private pump() {
    while (this.active < this.max && this.queue.length > 0) {
      const next = this.queue.shift();
      if (!next) return;
      this.active++;
      next.resolve(this.makeRelease());
    }
  }
}
