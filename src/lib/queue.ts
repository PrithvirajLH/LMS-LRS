/**
 * Lightweight in-process async work queue with back-pressure.
 *
 * Decouples "accept work" from "process work" so HTTP handlers can
 * respond immediately while storage writes happen in the background.
 *
 * Back-pressure: rejects new jobs when the queue exceeds maxQueueSize,
 * preventing unbounded memory growth under load.
 *
 * Limits: single-instance only. If the process crashes, queued jobs
 * are lost. For multi-instance deployments, swap this for Azure
 * Service Bus or Azure Queue Storage.
 */

import { logger } from "@/lib/logger";

type Job = () => Promise<void>;

interface QueueOptions {
  /** Max concurrent jobs (default 5) */
  concurrency?: number;
  /** Max retries per job (default 2) */
  maxRetries?: number;
  /** Max queued jobs before rejecting (default 50,000) */
  maxQueueSize?: number;
}

export class WorkQueue {
  private queue: Array<{ job: Job; retries: number }> = [];
  private running = 0;
  private concurrency: number;
  private maxRetries: number;
  private maxQueueSize: number;
  private _dropped = 0;

  constructor(opts: QueueOptions = {}) {
    this.concurrency = opts.concurrency ?? 5;
    this.maxRetries = opts.maxRetries ?? 2;
    this.maxQueueSize = opts.maxQueueSize ?? 50_000;
  }

  /**
   * Add a job to the queue. Returns true if accepted, false if rejected
   * due to back-pressure (queue full).
   */
  enqueue(job: Job): boolean {
    if (this.queue.length >= this.maxQueueSize) {
      this._dropped++;
      logger.error("Queue back-pressure: job rejected", {
        queueSize: this.queue.length,
        maxQueueSize: this.maxQueueSize,
        totalDropped: this._dropped,
      });
      return false;
    }
    this.queue.push({ job, retries: 0 });
    this.drain();
    return true;
  }

  /** Number of jobs waiting + running */
  get pending(): number {
    return this.queue.length + this.running;
  }

  /** Number of jobs dropped due to back-pressure */
  get dropped(): number {
    return this._dropped;
  }

  private drain(): void {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.running++;
      item
        .job()
        .catch((err) => {
          if (item.retries < this.maxRetries) {
            logger.warn("Queue job failed, retrying", {
              attempt: item.retries + 1,
              maxRetries: this.maxRetries,
              error: err instanceof Error ? err.message : String(err),
            });
            this.queue.push({ job: item.job, retries: item.retries + 1 });
          } else {
            logger.error("Queue job failed permanently", {
              attempts: item.retries + 1,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        })
        .finally(() => {
          this.running--;
          this.drain();
        });
    }
  }
}

/** Shared queue for background storage writes (statements, documents, etc.) */
export const storageQueue = new WorkQueue({
  concurrency: 10,
  maxRetries: 2,
  maxQueueSize: 50_000, // ~50K queued statements before rejecting
});
