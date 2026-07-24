import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { subscriptionService } from "@/features/subscription/services/subscription.service";

const SUBSCRIPTION_KEY = ["subscription", "summary"];

export function useSubscription() {
  return useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: subscriptionService.getSubscription,
  });
}

export function useInvoicesPage(page: number) {
  return useQuery({
    queryKey: ["subscription", "invoices", page],
    queryFn: () => subscriptionService.getInvoicesPage(page, 4),
    placeholderData: keepPreviousData,
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: subscriptionService.cancelSubscription,
    onSuccess: (summary) => {
      queryClient.setQueryData(SUBSCRIPTION_KEY, summary);
    },
  });
}
