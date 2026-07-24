import { useQuery } from "@tanstack/react-query";
import { sessionService } from "@/features/session/services/session.service";

export function useCurrentMember() {
  return useQuery({
    queryKey: ["session", "current-member"],
    queryFn: sessionService.getCurrentMember,
    staleTime: 5 * 60 * 1000,
  });
}
