import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { ChildProcess } from "node:child_process";
import type { Job, JobInput, YtDlpProgress } from "@vault/types";
import type { YtDlpManager } from "./ytdlp-manager";
import { createProgressTracker } from "./progress-tracker";

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
  const intentionallyKilled = new Set<string>();
  const storedInputs = new Map<string, StoredJobInput>();
  let maxConcurrent = opts.maxConcurrent ?? 3;

  function processQueue(): void {
    while (active.size < maxConcurrent && queue.length > 0) {
      const job = queue.shift()!;
      startJob(job, job.resume || false);
    }
  }

  function startJob(job: Job, resume = false): void {
    job.status = "active";
    emitter.emit("job:started", job);

    const tracker = createProgressTracker();

    const { process: proc, promise } = opts.ytdlp.download(
      job.url,
      job.outputTemplate,
      job.formatSelector,
      job.extra,
      (progress: YtDlpProgress) => {
        emitter.emit("job:progress", job.id, tracker.track(progress));
        if (tracker.isStalled(15000)) {
          console.warn(`[WorkerPool] Job ${job.id} appears stalled`);
        }
      },
      resume
    );

    active.set(job.id, { job, process: proc, promise });

    promise
      .then(() => {
        if (intentionallyKilled.has(job.id)) {
          intentionallyKilled.delete(job.id);
          return;
        }
        job.status = "completed";
        active.delete(job.id);
        emitter.emit("job:completed", job);
        processQueue();
      })
      .catch((err) => {
        if (intentionallyKilled.has(job.id)) {
          intentionallyKilled.delete(job.id);
          return;
        }
        job.status = "failed";
        storedInputs.set(job.id, { job: { ...job, resume: true } });
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
    queue.push(job);
    emitter.emit("job:queued", job);
    processQueue();
    return job.id;
  }

  function cancel(jobId: string): boolean {
    const queueIndex = queue.findIndex((j) => j.id === jobId);
    if (queueIndex !== -1) {
      const [job] = queue.splice(queueIndex, 1);
      job.status = "cancelled";
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
      emitter.emit("job:cancelled", activeJob.job);
      processQueue();
      return true;
    }
    // Also check paused jobs in storedInputs
    if (storedInputs.has(jobId)) {
      const stored = storedInputs.get(jobId)!;
      storedInputs.delete(jobId);
      // Emit cancelled event with the stored job data
      emitter.emit("job:cancelled", { ...stored.job, status: "cancelled" as const });
      return true;
    }
    return false;
  }

  function pause(jobId: string): boolean {
    const activeJob = active.get(jobId);
    if (!activeJob) {
      // Also check if job is in queue (not yet started)
      const queueIndex = queue.findIndex((j) => j.id === jobId);
      if (queueIndex !== -1) {
        const [job] = queue.splice(queueIndex, 1);
        job.status = "paused";
        storedInputs.set(jobId, { job: { ...job, resume: true } });
        emitter.emit("job:paused", job);
        return true;
      }
      return false;
    }
    intentionallyKilled.add(jobId);
    activeJob.process.kill("SIGTERM");
    storedInputs.set(jobId, { job: { ...activeJob.job, status: "paused", resume: true } });
    active.delete(jobId);
    emitter.emit("job:paused", activeJob.job);
    processQueue();
    return true;
  }

  function resume(jobId: string): string | null {
    const stored = storedInputs.get(jobId);
    if (!stored) return null;
    if (active.has(jobId)) active.delete(jobId);
    storedInputs.delete(jobId);
    const { job, resume } = stored;
    return enqueue(job, resume || false);
  }

  function retry(jobId: string): string | null {
    const stored = storedInputs.get(jobId);
    if (!stored) return null;
    if (active.has(jobId)) active.delete(jobId);
    storedInputs.delete(jobId);
    const { job } = stored;
    return enqueue(job, job.resume || false);
  }

  function setMaxConcurrent(n: number): void {
    maxConcurrent = n;
    processQueue();
  }

  return {
    on: emitter.on.bind(emitter),
    off: emitter.off.bind(emitter),
    enqueue,
    cancel,
    pause,
    resume,
    retry,
    setMaxConcurrent
  };
}

export type WorkerPool = ReturnType<typeof createWorkerPool>;
