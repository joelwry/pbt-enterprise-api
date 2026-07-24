import { Schema, model, Document, Types } from 'mongoose';

export type ResourceType = 'Template' | 'Guide' | 'Tool' | 'Video' | 'Document';
export type ResourceTier = 'Pathway' | 'Plus' | 'Mentorship';

export interface IResource extends Document {
  title: string;
  description: string;
  type: ResourceType;
  requiredTier: ResourceTier;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  tags: string[];
  downloads: number;
  createdBy: Types.ObjectId;
  isActive: boolean;
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
      enum: ['Template', 'Guide', 'Tool', 'Video', 'Document'],
      required: true,
      index: true,
    },
    requiredTier: {
      type: String,
      enum: ['Pathway', 'Plus', 'Mentorship'],
      default: 'Pathway',
      index: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
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
resourceSchema.pre(/^find/, function (next: Function) {
  // @ts-ignore
  if (this.where) {
    this.where({ deletedAt: { $exists: false } });
  }
  next();
});

// Create indexes
resourceSchema.index({ category: 1, type: 1 });
resourceSchema.index({ isActive: 1, releasedAt: 1 });

export const Resource = model<IResource>('Resource', resourceSchema);
