import { Schema, model, Document } from 'mongoose';

// Reconciled to match the frontend's actual, already-built shape (member
// power-team-view.tsx / admin partner-editor-view.tsx) -- this module had
// never been wired to auth or either frontend before, so nothing depended
// on the previous shape.
//
// "Letting Agents" is added to the category enum: the member-facing filter
// tabs already included it (with seeded mock partners in that category),
// but the admin category list -- and this schema -- never had it, meaning
// an admin could never actually create one.
export type PowerTeamCategory = 'Solicitors' | 'Mortgage Brokers' | 'Accountants' | 'Surveyors' | 'Letting Agents';

// The admin's 3-state "Verification Status" (Verified/Pending Review/
// Suspended) is derived from isActive + isVerified rather than stored as
// its own field -- isActive already exists (and already drives whether a
// partner is hidden from the member directory, same as every other soft
// "deactivate" flag in this codebase), so Suspended is just isActive:false;
// Verified vs Pending Review is isVerified on an otherwise-active partner.
export interface IPowerTeamMember extends Document {
  name: string;
  category: PowerTeamCategory;
  /** Admin-settable specific label shown to members, e.g. "RICS Surveyors" -- defaults to the category name if not set. */
  categoryLabel: string;
  bio: string;
  region: string;
  contactEmail: string;
  phone: string;
  website: string;
  /** Empty until an admin uploads a logo via the storage abstraction. */
  logoUrl: string;
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
      enum: ['Solicitors', 'Mortgage Brokers', 'Accountants', 'Surveyors', 'Letting Agents'],
      required: true,
      index: true,
    },
    categoryLabel: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      required: true,
    },
    region: {
      type: String,
      required: true,
      index: true,
    },
    contactEmail: {
      type: String,
      required: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: true,
    },
    website: {
      type: String,
      default: '',
    },
    logoUrl: {
      type: String,
      default: '',
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
powerTeamMemberSchema.pre(/^find|^countDocuments|^distinct/, function (this: any) {
  this.where({ deletedAt: { $exists: false } });
});

// Create indexes
powerTeamMemberSchema.index({ category: 1, isActive: 1 });
powerTeamMemberSchema.index({ region: 1, isVerified: 1 });

export const PowerTeamMember = model<IPowerTeamMember>('PowerTeamMember', powerTeamMemberSchema);
