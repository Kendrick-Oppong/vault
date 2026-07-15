import { useQuery } from "@tanstack/react-query";
import { appApi } from "@/lib/api/app";

export const useAppInfo = () =>
  useQuery({
    queryKey: ["app", "info"] as const,
    queryFn: () => appApi.getInfo(),
    staleTime: Infinity // App version doesn't change at runtime
  });
