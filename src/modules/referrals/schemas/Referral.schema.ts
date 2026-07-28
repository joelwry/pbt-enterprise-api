import { Schema, model, Document, Types } from 'mongoose';

/**
 * A Referral row is created only once a referred person actually creates an
 * account using another member's referral code (their own clientId/user id)
 * -- there's no "invite sent" row for a link that was merely shared, since
 * this system has no way to know a link was shared until someone acts on it.
 */
export interface IReferral extends Document {
  referrerId: Types.ObjectId;
  referredUserId: Types.ObjectId;
  rewardAmount: number;
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
      unique: true, // a member can only ever be credited to the one referral code they registered with
    },
    rewardAmount: {
      type: Number,
      required: true,
      default: 10,
    },
  },
  {
    timestamps: true,
    collection: 'referrals',
  }
);

referralSchema.index({ referrerId: 1, createdAt: -1 });

export const Referral = model<IReferral>('Referral', referralSchema);
