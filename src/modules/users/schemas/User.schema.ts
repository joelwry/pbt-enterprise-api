import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ADMIN_ROLE_SCHEMA_VALUES, AdminSection } from '@/core/auth/adminAccess';

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
  /** Stripe Customer id, set the first time this member ever completes a Checkout Session. */
  stripeCustomerId?: string;
  notificationPreferences: INotificationPreferences;
  role: 'member' | 'admin' | 'super_admin' | 'visitor';
  /**
   * The account's real staff role, one of the five in `ADMIN_ROLES`. Only
   * meaningful when `role` is 'admin' or 'super_admin'.
   *
   * `authorize()` still checks the coarse `role` field -- this one decides
   * which sections the account holds by default, resolved through
   * resolveAdminSections(). Typed as string because the column also still
   * accepts the display strings it used to be written as; read it via
   * resolveAdminRole(), never directly.
   */
  adminRole?: string;
  /**
   * Explicit per-account section access, overriding the role's defaults.
   *
   * Three states, all meaningful: absent means never customised (the role's
   * defaults apply), a populated array is exactly what this account can
   * reach, and an empty array is a deliberate lockout that must not fall
   * back to defaults. `default: undefined` keeps that first state real --
   * Mongoose would otherwise store `[]` and erase the distinction.
   */
  adminSections?: AdminSection[] | string[];
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
    stripeCustomerId: {
      type: String,
      index: true,
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
    adminRole: {
      type: String,
      // Canonical constants plus the legacy display strings they replaced,
      // so a database that hasn't run scripts/migrate-admin-roles.ts yet
      // still saves cleanly instead of failing enum validation on an
      // untouched field.
      enum: ADMIN_ROLE_SCHEMA_VALUES,
    },
    adminSections: {
      type: [String],
      default: undefined,
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
