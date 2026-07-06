import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import type { ChildProcess } from 'node:child_process'
import type { Job, JobInput, YtDlpProgress } from '@vault/types'
import type { YtDlpManager } from './ytdlp-manager'

export interface WorkerPoolOptions {
  ytdlp: YtDlpManager
  maxConcurrent?: number
}

interface ActiveJob {
  job: Job
  process: ChildProcess
  promise: Promise<void>
}

export class WorkerPool extends EventEmitter {
  private queue: Job[] = []
  private active = new Map<string, ActiveJob>()
  private maxConcurrent: number

  constructor(private opts: WorkerPoolOptions) {
    super()
    this.maxConcurrent = opts.maxConcurrent ?? 3
  }

  enqueue(input: JobInput): string {
    const job: Job = {
      ...input,
      id: randomUUID(),
      status: 'pending',
      createdAt: Date.now()
    }
    this.queue.push(job)
    this.emit('job:queued', job)
    this.processQueue()
    return job.id
  }

  cancel(jobId: string): boolean {
    // Check if it's in the queue
    const queueIndex = this.queue.findIndex((j) => j.id === jobId)
    if (queueIndex !== -1) {
      const [job] = this.queue.splice(queueIndex, 1)
      job.status = 'cancelled'
      this.emit('job:cancelled', job)
      return true
    }

    // Check if it's active
    const activeJob = this.active.get(jobId)
    if (activeJob) {
      activeJob.process.kill('SIGTERM')
      activeJob.job.status = 'cancelled'
      this.active.delete(jobId)
      this.emit('job:cancelled', activeJob.job)
      this.processQueue()
      return true
    }

    return false
  }

  setMaxConcurrent(n: number): void {
    this.maxConcurrent = n
    this.processQueue()
  }

  private processQueue(): void {
    while (this.active.size < this.maxConcurrent && this.queue.length > 0) {
      const job = this.queue.shift()!
      this.startJob(job)
    }
  }

  private startJob(job: Job): void {
    job.status = 'active'
    this.emit('job:started', job)

    const { process: proc, promise } = this.opts.ytdlp.download(
      job.url,
      job.outputTemplate,
      job.formatSelector,
      job.extra,
      (progress: YtDlpProgress) => {
        this.emit('job:progress', job.id, progress)
      }
    )

    this.active.set(job.id, { job, process: proc, promise })

    promise
      .then(() => {
        job.status = 'completed'
        this.active.delete(job.id)
        this.emit('job:completed', job)
        this.processQueue()
      })
      .catch((err) => {
        job.status = 'failed'
        this.active.delete(job.id)
        this.emit('job:failed', job, err)
        this.processQueue()
      })
  }
}

export type { JobInput }
