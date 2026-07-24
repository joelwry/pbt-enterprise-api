import type { ApiSuccess, ApiPaginated } from "@/types/api";
import type { SubscriptionSummary, Invoice } from "@/features/subscription/types";
import { subscriptionMock, invoicesMock } from "@/features/subscription/mocks/subscription.mock";

const SIMULATED_LATENCY_MS = 400;
const summaryStore: SubscriptionSummary = { ...subscriptionMock.data };
const invoicesStore: Invoice[] = [...invoicesMock];

export const subscriptionRepository = {
  async getSubscription(): Promise<ApiSuccess<SubscriptionSummary>> {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
    return { success: true, message: "Subscription retrieved successfully", data: summaryStore };

    // Live implementation, once the Express API exists:
    // const { data } = await apiClient.get<ApiSuccess<SubscriptionSummary>>("/members/me/subscription");
    // return data;
  },

  async getInvoicesPage(page: number, limit: number): Promise<ApiPaginated<Invoice>> {
    await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
    const start = (page - 1) * limit;
    const items = invoicesStore.slice(start, start + limit);
    const totalPages = Math.max(1, Math.ceil(invoicesStore.length / limit));

    return {
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        totalItems: invoicesStore.length,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };

    // Live implementation, once the Express API exists:
    // const { data } = await apiClient.get<ApiPaginated<Invoice>>("/members/me/invoices", { params: { page, limit } });
    // return data;
  },

  async cancelSubscription(): Promise<ApiSuccess<SubscriptionSummary>> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    summaryStore.status = "cancelled";
    return { success: true, message: "Subscription cancelled successfully", data: summaryStore };

    // Live implementation, once the Express API exists:
    // const { data } = await apiClient.post<ApiSuccess<SubscriptionSummary>>("/members/me/subscription/cancel");
    // return data;
  },
};
