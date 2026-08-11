import { Schema, model, Document, Types } from 'mongoose';

export interface TierPricingDocument extends Document {
  tier: 'pathway' | 'plus' | 'mentorship';
  billingCycle: 'monthly' | 'annual';
  /** VAT-exclusive amount, in major currency units (e.g. 99 = £99, not pence). */
  amount: number;
  currency: string;
  stripePriceId: string;
  /** True for the one row per tier/cycle Stripe/member checkout actually uses right now. Superseded rows are kept, never deleted, as a pricing history/audit trail. */
  isActive: boolean;
  /** True if this row's amount matches the hardcoded default (see pricing.service.ts) rather than an admin override -- lets the UI show "Default" vs "Custom". */
  isDefault: boolean;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tierPricingSchema = new Schema<TierPricingDocument>(
  {
    tier: {
      type: String,
      enum: ['pathway', 'plus', 'mentorship'],
      required: true,
      index: true,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      required: true,
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
    stripePriceId: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    isDefault: {
      type: Boolean,
      required: true,
      default: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

tierPricingSchema.index({ tier: 1, billingCycle: 1, isActive: 1 });

export const TierPricing = model<TierPricingDocument>('TierPricing', tierPricingSchema);
