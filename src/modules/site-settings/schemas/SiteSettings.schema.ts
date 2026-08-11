import { Schema, model, Document, Types } from 'mongoose';

/**
 * Singleton document (there is exactly one, always looked up with no
 * filter) holding site-wide terminology the client wants to be able to
 * change without a redeploy -- started with "Workshop" -> "Deal Clinic",
 * kept generic so a future renamed term is a new field here, not a new
 * module.
 */
export interface SiteSettingsDocument extends Document {
  workshopLabel: string;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const siteSettingsSchema = new Schema<SiteSettingsDocument>(
  {
    workshopLabel: {
      type: String,
      required: true,
      trim: true,
      default: 'Deal Clinic',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

export const SiteSettings = model<SiteSettingsDocument>('SiteSettings', siteSettingsSchema);
