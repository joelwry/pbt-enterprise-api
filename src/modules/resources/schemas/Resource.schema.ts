import { Schema, model, Document, Types } from 'mongoose';

// Reconciled to the client's requested Resources page sections (Downloads,
// Templates, Guides, Worksheets, Videos, Checklists) -- Webinar renamed to
// the broader Video, Worksheet/Checklist/Download added. Toolkit is kept
// alongside these: it backs the existing Featured Toolkit banner, which
// wasn't part of this request and shouldn't be removed.
export type ResourceType = 'Download' | 'Template' | 'Guide' | 'Worksheet' | 'Video' | 'Checklist' | 'Toolkit';
export type ResourceTier = 'Pathway' | 'Plus' | 'Mentorship';

export interface IResource extends Document {
  title: string;
  description: string;
  type: ResourceType;
  requiredTier: ResourceTier;
  /** Free descriptive line the admin sets — "12 pages", "58 min", "Interactive". */
  metaLabel: string;
  /** Empty until an admin uploads a file via the storage abstraction. */
  fileUrl: string;
  fileType: string;
  fileSize: number;
  tags: string[];
  downloads: number;
  createdBy: Types.ObjectId;
  isActive: boolean;
  /** Admin "Save as Draft" — hidden from every member-facing query regardless of isActive. */
  isDraft: boolean;
  releasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const resourceSchema = new Schema<IResource>(
  {
    title: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['Download', 'Template', 'Guide', 'Worksheet', 'Video', 'Checklist', 'Toolkit'],
      required: true,
      index: true,
    },
    requiredTier: {
      type: String,
      enum: ['Pathway', 'Plus', 'Mentorship'],
      default: 'Pathway',
      index: true,
    },
    metaLabel: {
      type: String,
      default: '',
    },
    fileUrl: {
      type: String,
      default: '',
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
        lowercase: true,
      },
    ],
    downloads: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDraft: {
      type: Boolean,
      default: false,
      index: true,
    },
    releasedAt: {
      type: Date,
      default: () => new Date(),
    },
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'resources',
  }
);

// Soft delete middleware
resourceSchema.pre(/^find|^countDocuments|^distinct/, function (this: any) {
  if (this.where) {
    this.where({ deletedAt: { $exists: false } });
  }
});

// Create indexes
resourceSchema.index({ isActive: 1, releasedAt: 1 });

export const Resource = model<IResource>('Resource', resourceSchema);
