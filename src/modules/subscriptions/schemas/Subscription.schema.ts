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
      index: true,
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
  },
  {
    timestamps: true,
  }
);

// Indexes for common queries
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 });
subscriptionSchema.index({ tier: 1 });

// Query middleware to exclude soft-deleted subscriptions
subscriptionSchema.pre(/^find|^countDocuments/, function (this: any) {
  if (this.where) {
    this.where({ cancelledAt: { $exists: false } });
  }
});

export const Subscription = model<SubscriptionDocument>(
  'Subscription',
  subscriptionSchema
);
