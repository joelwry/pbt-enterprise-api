import { Schema, model, Document, Types } from 'mongoose';

export type PowerTeamCategory = 'Solicitor' | 'Surveyor' | 'Accountant' | 'Mortgage Broker' | 'Other';

export interface IPowerTeamMember extends Document {
  name: string;
  category: PowerTeamCategory;
  company?: string;
  bio?: string;
  region?: string;
  contactEmail?: string;
  phone?: string;
  profileImageUrl?: string;
  linkedinUrl?: string;
  specialisms: string[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const powerTeamMemberSchema = new Schema<IPowerTeamMember>(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: ['Solicitor', 'Surveyor', 'Accountant', 'Mortgage Broker', 'Other'],
      required: true,
      index: true,
    },
    company: {
      type: String,
    },
    bio: {
      type: String,
    },
    region: {
      type: String,
      index: true,
    },
    contactEmail: {
      type: String,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
    },
    profileImageUrl: {
      type: String,
    },
    linkedinUrl: {
      type: String,
    },
    specialisms: [
      {
        type: String,
      },
    ],
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'power_team_members',
  }
);

// Soft delete middleware
powerTeamMemberSchema.pre(/^find/, function (this: any) {
  this.where({ deletedAt: { $exists: false } });
});

// Create indexes
powerTeamMemberSchema.index({ category: 1, isActive: 1 });
powerTeamMemberSchema.index({ region: 1, isVerified: 1 });

export const PowerTeamMember = model<IPowerTeamMember>('PowerTeamMember', powerTeamMemberSchema);
