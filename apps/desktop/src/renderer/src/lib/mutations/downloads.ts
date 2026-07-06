import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { downloadsApi } from '../api/downloads'
import { QueryKeys } from '../query-keys'
import type { JobInput, Job } from '@vault/types'

export const useQueueDownload = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: JobInput) => downloadsApi.queueDownload(input),
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.history.all() })
      toast.success('Download queued successfully', {
        description: `Job ID: ${jobId.slice(0, 8)}...`
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to queue download', {
        description: error.message
      })
    }
  })
}

export const useCancelDownload = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (jobId: string) => downloadsApi.cancelDownload(jobId),
    onSuccess: (success, jobId) => {
      if (success) {
        queryClient.setQueryData<Job[]>(QueryKeys.jobs.active(), (old) =>
          old ? old.filter((j) => j.id !== jobId) : []
        )
        toast.success('Download cancelled')
      } else {
        toast.error('Failed to cancel download', {
          description: 'Job not found or already completed'
        })
      }
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel download', {
        description: error.message
      })
    }
  })
}

export const useSetConcurrency = () => {
  return useMutation({
    mutationFn: (n: number) => downloadsApi.setConcurrency(n),
    onSuccess: (_, n) => {
      toast.success('Concurrency updated', {
        description: `Now running ${n} concurrent download${n !== 1 ? 's' : ''}`
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to update concurrency', {
        description: error.message
      })
    }
  })
}
