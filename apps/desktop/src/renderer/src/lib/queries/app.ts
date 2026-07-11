import { useQuery } from "@tanstack/react-query";

export const useAppInfo = () =>
  useQuery({
    queryKey: ["app", "info"] as const,
    queryFn: () => globalThis.api.getAppInfo(),
    staleTime: Infinity // App version doesn't change at runtime
  });
