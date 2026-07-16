import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { ChildProcess } from "node:child_process";
import type { Job, JobInput, YtDlpProgress } from "@vault/types";
import type { YtDlpManager } from "./ytdlp-manager";
import { ProgressTracker } from "./progress-tracker";

export interface WorkerPoolOptions {
  ytdlp: YtDlpManager;
  maxConcurrent?: number;
}

interface ActiveJob {
  job: Job;
  process: ChildProcess;
  promise: Promise<void>;
  tracker?: ProgressTracker;
}

interface StoredJobInput {
  url: string;
  outputTemplate: string;
  formatSelector: string;
  extra?: import("@vault/types").DownloadExtras;
  meta?: import("@vault/types").JobMeta;
}

export class WorkerPool extends EventEmitter {
  private readonly queue: Job[] = [];
  private readonly active = new Map<string, ActiveJob>();
  private maxConcurrent: number;
  /** Jobs whose processes were intentionally killed (pause) — catch handler skips these. */
  private readonly intentionallyKilled = new Set<string>();
  /** Stored inputs for paused/failed jobs so they can be re-enqueued. */
  private readonly storedInputs = new Map<string, StoredJobInput>();

  constructor(private readonly opts: WorkerPoolOptions) {
    super();
    this.maxConcurrent = opts.maxConcurrent ?? 3;
  }

  enqueue(input: JobInput): string {
    const job: Job = {
      ...input,
      id: randomUUID(),
      status: "pending",
      createdAt: Date.now()
    };
    this.queue.push(job);
    this.emit("job:queued", job);
    this.processQueue();
    return job.id;
  }

  cancel(jobId: string): boolean {
    // Check if it's in the queue
    const queueIndex = this.queue.findIndex((j) => j.id === jobId);
    if (queueIndex !== -1) {
      const [job] = this.queue.splice(queueIndex, 1);
      job.status = "cancelled";
      this.emit("job:cancelled", job);
      this.storedInputs.delete(jobId);
      return true;
    }

    // Check if it's active
    const activeJob = this.active.get(jobId);
    if (activeJob) {
      activeJob.process.kill("SIGTERM");
      activeJob.job.status = "cancelled";
      this.active.delete(jobId);
      this.storedInputs.delete(jobId);
      this.emit("job:cancelled", activeJob.job);
      this.processQueue();
      return true;
    }

    return false;
  }

  pause(jobId: string): boolean {
    const activeJob = this.active.get(jobId);
    if (!activeJob) return false;

    // Mark as intentionally killed so the catch handler in startJob skips it
    this.intentionallyKilled.add(jobId);
    activeJob.process.kill("SIGTERM");

    // Store the input for later resume
    this.storedInputs.set(jobId, {
      url: activeJob.job.url,
      outputTemplate: activeJob.job.outputTemplate,
      formatSelector: activeJob.job.formatSelector,
      extra: activeJob.job.extra,
      meta: activeJob.job.meta
    });

    // Update status in-place and emit paused (job stays in active map for renderer visibility)
    activeJob.job.status = "paused";
    this.emit("job:paused", activeJob.job);
    return true;
  }

  resume(jobId: string): string | null {
    const input = this.storedInputs.get(jobId);
    if (!input) return null;

    // Remove old paused/failed entry from active map
    const oldActive = this.active.get(jobId);
    if (oldActive) {
      this.active.delete(jobId);
    }
    this.storedInputs.delete(jobId);

    // Re-enqueue with a fresh ID
    return this.enqueue(input);
  }

  retry(jobId: string): string | null {
    const input = this.storedInputs.get(jobId);
    if (!input) return null;

    // Remove old failed entry from active map
    const oldActive = this.active.get(jobId);
    if (oldActive) {
      this.active.delete(jobId);
    }
    this.storedInputs.delete(jobId);

    // Re-enqueue with a fresh ID
    return this.enqueue(input);
  }

  setMaxConcurrent(n: number): void {
    this.maxConcurrent = n;
    this.processQueue();
  }

  private processQueue(): void {
    while (this.active.size < this.maxConcurrent && this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.startJob(job);
    }
  }

  private startJob(job: Job): void {
    job.status = "active";
    this.emit("job:started", job);

    // Initialize progress tracker
    const tracker = new ProgressTracker(job.meta?.expectedPath ? 0 : undefined);

    const { process: proc, promise } = this.opts.ytdlp.download(
      job.url,
      job.outputTemplate,
      job.formatSelector,
      job.extra,
      (progress: YtDlpProgress) => {
        // Track progress and emit enriched data
        const enriched = tracker.track(progress);
        this.emit("job:progress", job.id, enriched);

        // Detect stalls and warn
        if (tracker.isStalled(15000)) {
          console.warn(`[WorkerPool] Job ${job.id} appears stalled (no progress in 15s)`);
        }
      }
    );

    this.active.set(job.id, { job, process: proc, promise, tracker });

    promise
      .then(() => {
        if (this.intentionallyKilled.has(job.id)) {
          this.intentionallyKilled.delete(job.id);
          return;
        }
        job.status = "completed";
        this.active.delete(job.id);
        this.emit("job:completed", job);
        this.processQueue();
      })
      .catch((err) => {
        // Skip if this was an intentional kill (pause)
        if (this.intentionallyKilled.has(job.id)) {
          this.intentionallyKilled.delete(job.id);
          return;
        }

        // Log stall status for debugging
        if (tracker.isStalled()) {
          console.error(`[WorkerPool] Job ${job.id} failed after appearing stalled`);
        }

        job.status = "failed";
        // Store input so retry() can re-enqueue it
        this.storedInputs.set(job.id, {
          url: job.url,
          outputTemplate: job.outputTemplate,
          formatSelector: job.formatSelector,
          extra: job.extra,
          meta: job.meta
        });
        this.emit("job:failed", job, err);
        this.processQueue();
      });
  }
}
