import { Schema, model } from 'mongoose';

export type ContentType = 'lesson' | 'resource' | 'event' | 'discussion';

export interface IContentRelationship {
  sourceContentId: string;
  sourceType: ContentType;
  relatedContentId: string;
  relatedType: ContentType;
  relationshipType: 'prerequisite' | 'related' | 'deepdive' | 'followup' | 'supplementary';
  strength: number; // 0-100 relevance score
  explanation?: string;
  createdAt: Date;
  updatedAt: Date;
}

const contentRelationshipSchema = new Schema<IContentRelationship>(
  {
    sourceContentId: {
      type: String,
      required: true,
      index: true,
    },
    sourceType: {
      type: String,
      enum: ['lesson', 'resource', 'event', 'discussion'],
      required: true,
    },
    relatedContentId: {
      type: String,
      required: true,
      index: true,
    },
    relatedType: {
      type: String,
      enum: ['lesson', 'resource', 'event', 'discussion'],
      required: true,
    },
    relationshipType: {
      type: String,
      enum: ['prerequisite', 'related', 'deepdive', 'followup', 'supplementary'],
      required: true,
    },
    strength: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    explanation: String,
  },
  {
    timestamps: true,
    collection: 'content_relationships',
  }
);

contentRelationshipSchema.index({ sourceContentId: 1, relatedContentId: 1 });
contentRelationshipSchema.index({ sourceContentId: 1, relationshipType: 1 });

export const ContentRelationship = model<IContentRelationship>(
  'ContentRelationship',
  contentRelationshipSchema
);
