import { Schema, model, Document, Types } from 'mongoose';

export type MembershipTier = 'Pathway' | 'Plus' | 'Mentorship';

export interface IMembership extends Document {
  userId: Types.ObjectId;
  tier: MembershipTier;
  status: 'active' | 'inactive' | 'suspended' | 'cancelled';
  startDate: Date;
  renewalDate?: Date;
  cancellationDate?: Date;
  autoRenew: boolean;
  paymentMethod?: string;
  accessibleYears: string[]; // Years the user has access to (e.g., ['2024', '2025'])
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tier: {
      type: String,
      enum: ['Pathway', 'Plus', 'Mentorship'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'cancelled'],
      default: 'active',
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    renewalDate: {
      type: Date,
    },
    cancellationDate: {
      type: Date,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    paymentMethod: {
      type: String,
    },
    accessibleYears: {
      type: [String],
      default: [],
      index: true,
    },
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'memberships',
  }
);

// Soft delete query middleware
membershipSchema.pre(/^find|^countDocuments|^distinct/, function (this: any) {
  this.where({ deletedAt: { $exists: false } });
});

// Create indexes
membershipSchema.index({ userId: 1, status: 1 });
membershipSchema.index({ tier: 1, status: 1 });

export const Membership = model<IMembership>('Membership', membershipSchema);
