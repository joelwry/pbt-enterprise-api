import { subscriptionRepository } from "@/features/subscription/repositories/subscription.repository";
import type { SubscriptionSummary, Invoice } from "@/features/subscription/types";
import type { Pagination } from "@/types/api";

export interface InvoicesPage {
  items: Invoice[];
  pagination: Pagination;
}

export const subscriptionService = {
  async getSubscription(): Promise<SubscriptionSummary> {
    const response = await subscriptionRepository.getSubscription();
    return response.data;
  },

  async getInvoicesPage(page: number, limit: number): Promise<InvoicesPage> {
    const response = await subscriptionRepository.getInvoicesPage(page, limit);
    return { items: response.data, pagination: response.pagination };
  },

  async cancelSubscription(): Promise<SubscriptionSummary> {
    const response = await subscriptionRepository.cancelSubscription();
    return response.data;
  },
};
