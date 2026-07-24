import { Schema, model, Document, Types } from 'mongoose';

export type EventCategory = 'Mentorship' | 'In-Person' | 'Community' | 'Masterclass' | 'Onboarding';

export interface IRsvpDetails {
  guestCount: number;
  notes: string;
  createdAt: Date;
}

export interface IEvent extends Document {
  title: string;
  description: string;
  date: Date;
  timeLabel: string;
  location: string;
  category: EventCategory;
  capacity: number;
  rsvps: Types.ObjectId[];
  rsvpDetails: Map<string, IRsvpDetails>;
  eventUrl?: string;
  imageUrl?: string;
  createdBy: Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const eventSchema = new Schema<IEvent>(
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
    date: {
      type: Date,
      required: true,
      index: true,
    },
    timeLabel: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['Mentorship', 'In-Person', 'Community', 'Masterclass', 'Onboarding'],
      required: true,
      index: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
    rsvps: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    rsvpDetails: {
      type: Map,
      of: {
        guestCount: Number,
        notes: String,
        createdAt: Date,
      },
    },
    eventUrl: {
      type: String,
    },
    imageUrl: {
      type: String,
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
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'events',
  }
);

// Soft delete middleware
eventSchema.pre(/^find/, function (this: any) {
  this.where({ deletedAt: { $exists: false } });
});

// Create indexes
eventSchema.index({ date: 1, category: 1 });
eventSchema.index({ isActive: 1, date: 1 });

export const Event = model<IEvent>('Event', eventSchema);
