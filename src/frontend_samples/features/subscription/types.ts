import type { MembershipTier } from "@/features/session/types";

export type SubscriptionStatus = "active" | "cancelled";

export interface SubscriptionSummary {
  tier: MembershipTier;
  status: SubscriptionStatus;
  contractLabel: string;
  clientId: string;
  nextBillingLabel: string;
  amountLabel: string;
  paymentMethodLabel: string;
}

export type InvoiceStatus = "Paid" | "Pending" | "Failed";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  dateLabel: string;
  amountLabel: string;
  status: InvoiceStatus;
}
