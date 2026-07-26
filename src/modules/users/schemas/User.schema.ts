import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface INotificationPreferences {
  communityReplies: boolean;
  eventReminders: boolean;
  newModuleReleases: boolean;
  marketingUpdates: boolean;
}

export interface IUser extends Document {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  location?: string;
  investmentFocus?: string;
  /** Set by admin/mentor-matching tooling, not editable by the member. */
  assignedLeader?: string;
  notificationPreferences: INotificationPreferences;
  role: 'member' | 'admin' | 'super_admin' | 'visitor';
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/, 'Please provide a valid email'],
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
      minlength: 6,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatarUrl: {
      type: String,
    },
    location: {
      type: String,
      trim: true,
    },
    investmentFocus: {
      type: String,
      trim: true,
    },
    assignedLeader: {
      type: String,
      trim: true,
    },
    notificationPreferences: {
      communityReplies: { type: Boolean, default: true },
      eventReminders: { type: Boolean, default: true },
      newModuleReleases: { type: Boolean, default: true },
      marketingUpdates: { type: Boolean, default: false },
    },
    role: {
      type: String,
      enum: ['member', 'admin', 'super_admin', 'visitor'],
      default: 'member',
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      select: false,
    },
    emailVerificationExpiry: {
      type: Date,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpiry: {
      type: Date,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
    },
    deletedAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Hash password before saving
userSchema.pre('save', async function (this: any) {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// Soft delete query middleware
userSchema.pre(/^find|^countDocuments|^distinct/, function (this: any) {
  if (this.where) {
    this.where({ deletedAt: { $exists: false } });
  }
});

// Create indexes
userSchema.index({ email: 1, deletedAt: 1 });
userSchema.index({ role: 1, isActive: 1 });

export const User = model<IUser>('User', userSchema);
