/**
 * One outstanding request per host at a time, with a minimum gap between
 * requests to the same host. Keeps the crawler polite without needing an
 * external queueing library.
 */
export class HostRateLimiter {
  private queues = new Map<string, Promise<void>>();
  private lastRequestAt = new Map<string, number>();

  constructor(private readonly minGapMs = 600) {}

  async run<T>(host: string, task: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(host) ?? Promise.resolve();
    let release: () => void;
    const next = new Promise<void>((resolve) => (release = resolve));
    this.queues.set(
      host,
      previous.then(() => next),
    );

    await previous;
    const last = this.lastRequestAt.get(host) ?? 0;
    const wait = Math.max(0, this.minGapMs - (Date.now() - last));
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));

    try {
      return await task();
    } finally {
      this.lastRequestAt.set(host, Date.now());
      release!();
    }
  }
}

export const globalRateLimiter = new HostRateLimiter();
