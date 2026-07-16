import { useQuery } from "@tanstack/react-query";
import { QueryKeys } from "@/lib/constants/query-keys";
import type { DependenciesCheckResult } from "@/features/dependency-checker/types";

export const useDependenciesCheck = () =>
  useQuery<DependenciesCheckResult>({
    queryKey: ["dependencies", "check"],
    queryFn: () => globalThis.api.dependenciesCheck?.() ?? Promise.resolve({
      ready: false,
      ytDlp: { name: "yt-dlp", installed: false },
      ffmpeg: { name: "ffmpeg", installed: false },
      errors: ["API not available"],
      errorMessage: "Cannot check dependencies"
    }),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 5 // 5 minutes
  });
