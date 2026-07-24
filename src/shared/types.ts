/**
 * Shared TypeScript Types and Interfaces
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface PaginatedApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T[];
  pagination: PaginationData;
}

export interface PaginationData {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  membershipTier: string;
  iat?: number;
  exp?: number;
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  location?: string;
  investmentFocus?: string;
  membershipTier: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipData {
  id: string;
  userId: string;
  tier: string;
  status: 'active' | 'inactive' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  accessibleYears: number[];
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  year: number;
  lessons: LearningLesson[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningLesson {
  id: string;
  title: string;
  description: string;
  duration: number;
  videoUrl?: string;
  content: string;
  resources?: LearningResource[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningResource {
  id: string;
  title: string;
  type: string;
  url: string;
  description?: string;
}

export interface UserProgress {
  userId: string;
  lessonId: string;
  moduleId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number; // 0-100
  lastAccessedAt: Date;
  completedAt?: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  startDate: Date;
  endDate: Date;
  location?: string;
  virtualLink?: string;
  capacity?: number;
  rsvpCount: number;
  image?: string;
  presenter?: EventPresenter;
  agenda?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EventPresenter {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  avatar?: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  url: string;
  fileSize?: number;
  downloadCount: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityThread {
  id: string;
  title: string;
  description: string;
  category: string;
  createdBy: UserProfile;
  viewCount: number;
  replyCount: number;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityReply {
  id: string;
  content: string;
  createdBy: UserProfile;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Leader {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  bio?: string;
  region: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PowerTeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  bio?: string;
  category: string; // e.g., Solicitor, Accountant, Surveyor
  region: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreference {
  emailNotifications: boolean;
  smsNotifications: boolean;
  eventReminders: boolean;
  newContent: boolean;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  tier: string;
  status: 'active' | 'cancelled' | 'suspended';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  paymentMethod?: {
    brand: string;
    last4: string;
    expiryMonth: number;
    expiryYear: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingHistory {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed';
  description: string;
  invoiceUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: string[];
  code?: string;
  timestamp: Date;
}

export interface FileUpload {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: any;
}

export interface RequestContext {
  userId?: string;
  userRole?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
}
