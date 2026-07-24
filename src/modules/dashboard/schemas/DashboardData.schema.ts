import { Schema, model, Types } from 'mongoose';

interface IDashboardData {
  memberId: Types.ObjectId;
  continuJourney?: {
    journeyId: Types.ObjectId;
    title: string;
    progress: number;
  };
  upcomingEvents: Schema.Types.ObjectId[];
  recommendedResources: Schema.Types.ObjectId[];
  industryInsights: Schema.Types.ObjectId[];
  notifications: Array<any>;
  teamUpdates: Schema.Types.ObjectId[];
  suggestedConnections: Schema.Types.ObjectId[];
  mentorActivity?: Types.ObjectId;
  lastUpdated: Date;
  createdAt: Date;
}

const dashboardDataSchema = new Schema<IDashboardData>({
  memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  continuJourney: {
    journeyId: Schema.Types.ObjectId,
    title: String,
    progress: Number,
  },
  upcomingEvents: [{ type: Schema.Types.ObjectId, ref: 'Event' }],
  recommendedResources: [{ type: Schema.Types.ObjectId, ref: 'Resource' }],
  industryInsights: [{ type: Schema.Types.ObjectId, ref: 'IndustryInsight' }],
  notifications: Schema.Types.Mixed,
  teamUpdates: [{ type: Schema.Types.ObjectId, ref: 'PowerTeam' }],
  suggestedConnections: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  mentorActivity: { type: Schema.Types.ObjectId, ref: 'Mentor' },
  lastUpdated: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

export const DashboardData = model<IDashboardData>('DashboardData', dashboardDataSchema);
export type { IDashboardData };
