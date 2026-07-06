import { useQuery } from '@tanstack/react-query'
import { downloadsApi } from '../api/downloads'
import { QueryKeys } from '../query-keys'

export const useProbeFormats = (url: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: QueryKeys.formats.probe(url),
    queryFn: () => downloadsApi.probeFormats(url),
    enabled: !!url && options?.enabled !== false
  })
