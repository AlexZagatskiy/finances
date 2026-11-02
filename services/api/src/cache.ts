export class ServiceError extends Error {
  statusCode: number;
  code: string;
  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Bounded process-local cache. A single promise coalesces simultaneous misses.
export class Cache {
  private entries = new Map<string, { value: unknown; fetched: number; expires: number }>();
  private pending = new Map<string, Promise<{ value: unknown; stale: boolean }>>();
  private failures = new Map<string, { until: number; error: unknown }>();

  constructor(privateNow: () => number = Date.now, limit = 1000) {
    this.now = privateNow;
    this.limit = limit;
  }

  private now: () => number;
  private limit: number;

  async get<T>(
    key: string,
    ttl: number | ((value: T) => number),
    maxAge: number,
    load: () => Promise<T>,
  ): Promise<{ value: T; stale: boolean }> {
    const entry = this.entries.get(key);
    if (entry && entry.expires > this.now()) return { value: entry.value as T, stale: false };

    const pending = this.pending.get(key);
    if (pending) return pending as Promise<{ value: T; stale: boolean }>;

    const fallback = (error: unknown): { value: T; stale: boolean } => {
      const transient =
        !(error instanceof ServiceError) || [429, 502, 503, 504].includes(error.statusCode);
      if (transient && entry && this.now() - entry.fetched < maxAge) {
        return { value: entry.value as T, stale: true };
      }
      throw error;
    };
    const failure = this.failures.get(key);
    if (failure && failure.until > this.now()) return fallback(failure.error);
    const request = (async () => {
      try {
        const value = await load();
        this.failures.delete(key);
        if (this.entries.size >= this.limit) this.entries.delete(this.entries.keys().next().value!);
        const fetched = this.now();
        this.entries.set(key, {
          value,
          fetched,
          expires: fetched + (typeof ttl === 'number' ? ttl : ttl(value)),
        });
        return { value, stale: false };
      } catch (error) {
        if (this.failures.size >= this.limit)
          this.failures.delete(this.failures.keys().next().value!);
        this.failures.set(key, { until: this.now() + 30_000, error });
        return fallback(error);
      } finally {
        this.pending.delete(key);
      }
    })();
    this.pending.set(key, request);
    return request;
  }
}
