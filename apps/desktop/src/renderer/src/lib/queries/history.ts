import { useQuery } from "@tanstack/react-query";
import { historyApi } from "@/lib/api/history";
import { QueryKeys } from "@/lib/constants/query-keys";

export const useHistory = (limit?: number, offset?: number) =>
  useQuery({
    queryKey: QueryKeys.history.all(limit, offset),
    queryFn: () => historyApi.list(limit, offset)
  });
