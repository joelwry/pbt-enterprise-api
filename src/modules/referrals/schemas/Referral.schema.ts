import { Schema, model, Document, Types } from 'mongoose';

/**
 * Referral lifecycle, as specified by the client. In the live product flow
 * (Stripe Checkout -> webhook), account creation and first-payment
 * confirmation happen atomically in the same webhook call -- so a live
 * referral is created directly at REWARD_EARNED, skipping the earlier
 * states in one step. Those earlier states exist for the one other code
 * path that can create a Referral (the legacy `POST /auth/register`
 * endpoint, which creates an account with no payment at all -- see
 * ARCHITECTURE_HANDBOOK.md) and for any future flow that has a genuine gap
 * between signup and first payment (e.g. a trial period).
 *
 * FIRST_PAYMENT_RECEIVED is part of the enum for documentation/completeness
 * but is never actually persisted today, since qualification and reward
 * calculation happen in the same synchronous step once a first payment is
 * confirmed -- there is no observable moment where a referral sits in
 * FIRST_PAYMENT_RECEIVED without also already being REWARD_EARNED.
 */
export type ReferralStatus =
  | 'REFERRED'
  | 'CUSTOMER_SIGNED_UP'
  | 'AWAITING_FIRST_PAYMENT'
  | 'FIRST_PAYMENT_RECEIVED'
  | 'REWARD_EARNED'
  | 'PAYMENT_PENDING'
  | 'PAID';

export const REFERRAL_STATUSES: ReferralStatus[] = [
  'REFERRED',
  'CUSTOMER_SIGNED_UP',
  'AWAITING_FIRST_PAYMENT',
  'FIRST_PAYMENT_RECEIVED',
  'REWARD_EARNED',
  'PAYMENT_PENDING',
  'PAID',
];

export interface IReferral extends Document {
  referrerId: Types.ObjectId;
  /** Unique -- a member can only ever be credited to the one referral code they registered with, and can only ever generate one reward, ever. */
  referredUserId: Types.ObjectId;
  status: ReferralStatus;

  // Populated once the referred member's qualifying first payment is known
  // (today: always at creation time, via the billing webhook -- see module docstring above).
  referredTier?: 'pathway' | 'plus' | 'mentorship';
  referredBillingCycle?: 'monthly' | 'annual';
  firstPaymentAmount?: number;
  firstPaymentDate?: Date;
  /** The Subscription this reward was calculated from -- kept for audit/traceability, not for re-deriving the amount later (see referral-reward.service.ts). */
  firstPaymentSubscriptionId?: Types.ObjectId;

  /** Stored per-record (not just computed from a global constant) so the reward stays correct in history even if the platform's referral rate ever changes. */
  rewardPercentage: number;
  /** = round(firstPaymentAmount * rewardPercentage / 100, 2). Undefined until qualified. */
  rewardAmount?: number;
  /** When the reward was calculated (today: === firstPaymentDate). */
  qualifiedAt?: Date;

  // Admin payout tracking -- this system only tracks/records that PBT paid
  // the reward externally; it never moves money itself.
  paidAt?: Date;
  paidBy?: Types.ObjectId;
  paymentReference?: string;
  adminNote?: string;

  createdAt: Date;
  updatedAt: Date;
}

const referralSchema = new Schema<IReferral>(
  {
    referrerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    referredUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: REFERRAL_STATUSES,
      required: true,
      default: 'REFERRED',
      index: true,
    },
    referredTier: {
      type: String,
      enum: ['pathway', 'plus', 'mentorship'],
    },
    referredBillingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
    },
    firstPaymentAmount: {
      type: Number,
      min: 0,
    },
    firstPaymentDate: {
      type: Date,
    },
    firstPaymentSubscriptionId: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    rewardPercentage: {
      type: Number,
      required: true,
      default: 10,
    },
    rewardAmount: {
      type: Number,
      min: 0,
    },
    qualifiedAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    paidBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    paymentReference: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    collection: 'referrals',
  }
);

referralSchema.index({ referrerId: 1, createdAt: -1 });
referralSchema.index({ status: 1, createdAt: -1 });

export const Referral = model<IReferral>('Referral', referralSchema);
