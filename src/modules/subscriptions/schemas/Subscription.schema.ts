import { Schema, model, Document, Types } from 'mongoose';

export interface SubscriptionDocument extends Document {
  userId: Types.ObjectId;
  tier: 'pathway' | 'plus' | 'mentorship';
  status: 'active' | 'pending' | 'cancelled' | 'expired';
  startDate: Date;
  endDate: Date;
  autoRenew: boolean;
  billingCycle: 'monthly' | 'annual';
  amount: number;
  currency: string;
  transactionId?: string;
  cancelledAt?: Date;
  /** Real Stripe subscription id, once the Stripe integration creates this record from a webhook. */
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<SubscriptionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ['pathway', 'plus', 'mentorship'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'cancelled', 'expired'],
      required: true,
      default: 'active',
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    endDate: {
      type: Date,
      required: true,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      required: true,
      default: 'monthly',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'GBP',
    },
    transactionId: {
      type: String,
      sparse: true,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    stripeSubscriptionId: {
      type: String,
      index: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 });
subscriptionSchema.index({ tier: 1 });

// Note: deliberately no soft-delete query middleware here, unlike every other
// schema in this codebase. `cancelledAt` is a real business field (when a
// member cancelled, if at all) -- not a deletion marker. A cancelled
// subscription must stay fully queryable: cancelSubscription() only flips
// autoRenew off and stamps cancelledAt, the member keeps access until
// endDate naturally passes (getCurrentSubscription already filters on that),
// and both the member's own billing history and the admin billing dashboard
// need to see cancelled/expired subscriptions, not just active ones. An
// earlier version of this file copied the soft-delete pattern used elsewhere
// and excluded any document with cancelledAt set -- which meant cancelling
// made the subscription vanish immediately instead of lapsing at endDate.

export const Subscription = model<SubscriptionDocument>(
  'Subscription',
  subscriptionSchema
);
