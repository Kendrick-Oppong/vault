import { useQuery } from "@tanstack/react-query";
import { downloadsApi } from "@/lib/api/downloads";

export const useDependenciesCheck = () =>
  useQuery({
    queryKey: ["dependencies", "check"],
    queryFn: () => downloadsApi.dependenciesCheck(),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 5 // 5 minutes
  });
