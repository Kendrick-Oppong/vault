import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { ChildProcess } from "node:child_process";
import type { Job, JobInput, YtDlpProgress } from "@vault/types";
import type { YtDlpManager } from "./ytdlp-manager";
import { createProgressTracker } from "./progress-tracker";
import { logger } from "./logger";

export interface WorkerPoolOptions {
  ytdlp: YtDlpManager;
  maxConcurrent?: number;
}

interface ActiveJob {
  job: Job;
  process: ChildProcess;
  promise: Promise<void>;
}

interface StoredJobInput {
  job: Job;
  resume?: boolean;
}

export function createWorkerPool(opts: WorkerPoolOptions) {
  const emitter = new EventEmitter();
  const queue: Job[] = [];
  const active = new Map<string, ActiveJob>();
  const completed = new Map<string, Job>();
  const intentionallyKilled = new Set<string>();
  const storedInputs = new Map<string, StoredJobInput>();
  let maxConcurrent = opts.maxConcurrent ?? 3;
  const MAX_COMPLETED = 100;

  function processQueue(): void {
    logger.debug("Processing queue:", {
      queueSize: queue.length,
      activeCount: active.size,
      maxConcurrent
    });
    while (active.size < maxConcurrent && queue.length > 0) {
      const job = queue.shift()!;
      logger.debug("Dequeuing job:", job.id);
      startJob(job, job.resume || false);
    }
  }

  function startJob(job: Job, resume = false): void {
    logger.info("Starting job:", job.id, job.url, resume ? "(resume)" : "");
    logger.debug("Job details:", {
      id: job.id,
      url: job.url,
      formatSelector: job.formatSelector,
      outputTemplate: job.outputTemplate,
      downloadPath: job.downloadPath,
      resume
    });
    job.status = "active";
    emitter.emit("job:started", job);

    const tracker = createProgressTracker();

    const { process: proc, promise } = opts.ytdlp.download(
      job.url,
      job.outputTemplate,
      job.formatSelector,
      job.extra,
      job.downloadPath,
      (progress: YtDlpProgress) => {
        const tracked = tracker.track(progress);
        emitter.emit("job:progress", job.id, tracked);
        if (tracker.isStalled(15000)) {
          logger.warn(`Job ${job.id} appears stalled, last progress:`, tracked);
        }
      },
      resume
    );

    active.set(job.id, { job, process: proc, promise });
    logger.debug("Job added to active set:", job.id, "Active count:", active.size);

    promise
      .then(() => {
        if (intentionallyKilled.has(job.id)) {
          intentionallyKilled.delete(job.id);
          logger.info("Job cancelled:", job.id);
          return;
        }
        logger.info("Job completed:", job.id);
        job.status = "completed";
        active.delete(job.id);
        completed.set(job.id, job);
        logger.debug("Job moved to completed set:", job.id, "Completed count:", completed.size);
        // Limit completed jobs to MAX_COMPLETED
        if (completed.size > MAX_COMPLETED) {
          const oldestId = completed.keys().next().value;
          if (oldestId) {
            completed.delete(oldestId);
            logger.debug("Removed oldest completed job:", oldestId);
          }
        }
        emitter.emit("job:completed", job);
        processQueue();
      })
      .catch((err) => {
        if (intentionallyKilled.has(job.id)) {
          intentionallyKilled.delete(job.id);
          logger.info("Job cancelled:", job.id);
          return;
        }
        logger.error("Job failed:", job.id, err instanceof Error ? err.message : String(err));
        logger.debug("Error details:", err);
        job.status = "failed";
        storedInputs.set(job.id, { job: { ...job, resume: true } });
        logger.debug("Job stored for retry:", job.id);
        emitter.emit("job:failed", job, err);
        processQueue();
      });
  }

  function enqueue(input: JobInput, resume = false): string {
    const job: Job = {
      ...input,
      id: randomUUID(),
      status: "pending",
      createdAt: Date.now(),
      resume
    };
    logger.info("Enqueuing job:", job.id, job.url, resume ? "(resume)" : "");
    logger.debug("Job input details:", input);
    queue.push(job);
    emitter.emit("job:queued", job);
    logger.debug("Queue size after enqueue:", queue.length);
    processQueue();
    return job.id;
  }

  function cancel(jobId: string): boolean {
    logger.info("Cancelling job:", jobId);
    const queueIndex = queue.findIndex((j) => j.id === jobId);
    if (queueIndex !== -1) {
      const [job] = queue.splice(queueIndex, 1);
      job.status = "cancelled";
      logger.debug("Job cancelled from queue:", jobId);
      emitter.emit("job:cancelled", job);
      storedInputs.delete(jobId);
      return true;
    }
    const activeJob = active.get(jobId);
    if (activeJob) {
      intentionallyKilled.add(jobId);
      activeJob.process.kill("SIGTERM");
      activeJob.job.status = "cancelled";
      active.delete(jobId);
      storedInputs.delete(jobId);
      logger.debug("Job cancelled from active:", jobId);
      emitter.emit("job:cancelled", activeJob.job);
      processQueue();
      return true;
    }
    // Also check paused jobs in storedInputs
    if (storedInputs.has(jobId)) {
      const stored = storedInputs.get(jobId)!;
      storedInputs.delete(jobId);
      logger.debug("Job cancelled from stored inputs:", jobId);
      // Emit cancelled event with the stored job data
      emitter.emit("job:cancelled", { ...stored.job, status: "cancelled" as const });
      return true;
    }
    logger.warn("Job not found for cancellation:", jobId);
    return false;
  }

  function pause(jobId: string): boolean {
    logger.info("Pausing job:", jobId);
    const activeJob = active.get(jobId);
    if (!activeJob) {
      // Also check if job is in queue (not yet started)
      const queueIndex = queue.findIndex((j) => j.id === jobId);
      if (queueIndex !== -1) {
        const [job] = queue.splice(queueIndex, 1);
        job.status = "paused";
        storedInputs.set(jobId, { job: { ...job, resume: true } });
        logger.debug("Job paused from queue:", jobId);
        emitter.emit("job:paused", job);
        return true;
      }
      logger.warn("Job not found for pause:", jobId);
      return false;
    }
    intentionallyKilled.add(jobId);
    activeJob.process.kill("SIGTERM");
    storedInputs.set(jobId, { job: { ...activeJob.job, status: "paused", resume: true } });
    active.delete(jobId);
    logger.debug("Job paused from active:", jobId);
    emitter.emit("job:paused", activeJob.job);
    processQueue();
    return true;
  }

  function resume(jobId: string): string | null {
    logger.info("Resuming job:", jobId);
    const stored = storedInputs.get(jobId);
    if (!stored) {
      logger.warn("Job not found for resume:", jobId);
      return null;
    }
    if (active.has(jobId)) active.delete(jobId);
    storedInputs.delete(jobId);
    const { job, resume } = stored;
    logger.debug("Job details for resume:", { id: job.id, url: job.url, resume });
    return enqueue(job, resume || false);
  }

  function retry(jobId: string): string | null {
    logger.info("Retrying job:", jobId);
    const stored = storedInputs.get(jobId);
    if (!stored) {
      logger.warn("Job not found for retry:", jobId);
      return null;
    }
    if (active.has(jobId)) active.delete(jobId);
    storedInputs.delete(jobId);
    const { job } = stored;
    logger.debug("Job details for retry:", { id: job.id, url: job.url });
    return enqueue(job, job.resume || false);
  }

  function setMaxConcurrent(n: number): void {
    logger.info("Setting max concurrent downloads:", n);
    maxConcurrent = n;
    processQueue();
  }

  function getJobs(): Job[] {
    const pausedJobs = Array.from(storedInputs.values())
      .filter((stored) => stored.job.status === "paused")
      .map((stored) => stored.job);
    return [...queue, ...active.values().map((a) => a.job), ...completed.values(), ...pausedJobs];
  }

  return {
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    enqueue,
    cancel,
    pause,
    resume,
    retry,
    setMaxConcurrent,
    getJobs
  };
}

export type WorkerPool = ReturnType<typeof createWorkerPool>;
