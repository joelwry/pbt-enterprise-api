import { Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MEMBERSHIP_BADGE } from "@/features/session/membership-badge";
import type { SubscriptionSummary } from "@/features/subscription/types";

export function SubscriptionHeroCard({ subscription }: { subscription: SubscriptionSummary }) {
  const badge = MEMBERSHIP_BADGE[subscription.tier];
  const isActive = subscription.status === "active";

  return (
    <Card className="bg-gradient-to-r from-navy-950 to-sky-600 border-none">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge variant="orange" className="mb-3">
            <Crown className="h-3 w-3" />
            {badge.label}
          </Badge>
          <h3 className="font-display text-lg font-bold text-white">
            {isActive ? "Your membership is active" : "Your membership has been cancelled"}
          </h3>
          <p className="text-sm text-white/70 mt-1">{subscription.contractLabel}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">Client ID</p>
          <p className="font-display text-base font-bold text-white mt-1">{subscription.clientId}</p>
        </div>
      </div>

      {isActive && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">Next Billing</p>
            <p className="text-sm font-semibold text-white mt-1">{subscription.nextBillingLabel}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">Amount</p>
            <p className="text-sm font-semibold text-white mt-1">{subscription.amountLabel}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">Payment Method</p>
            <p className="text-sm font-semibold text-white mt-1">{subscription.paymentMethodLabel}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
