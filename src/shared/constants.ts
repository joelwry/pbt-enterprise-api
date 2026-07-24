/**
 * Application Constants
 */

export const MEMBERSHIP_TIERS = {
  FREE: 'free',
  PLUS: 'plus',
  MENTORSHIP: 'mentorship',
} as const;

export const MEMBERSHIP_TIER_DETAILS = {
  [MEMBERSHIP_TIERS.FREE]: {
    name: 'Free',
    price: 0,
    description: 'Get started with PBT',
    features: ['Access to basic learning modules', 'Community forum access', 'Basic resources'],
  },
  [MEMBERSHIP_TIERS.PLUS]: {
    name: 'PBT Plus',
    price: 4999, // $49.99 in cents
    description: 'Premium training and resources',
    features: [
      'All Free features',
      'All training modules and years',
      'Advanced resources',
      'Event access',
      'Email support',
    ],
  },
  [MEMBERSHIP_TIERS.MENTORSHIP]: {
    name: 'PBT Mentorship',
    price: 9999, // $99.99 in cents
    description: 'Premium training with personal mentor',
    features: [
      'All Plus features',
      'Personal mentor assignment',
      '1-on-1 coaching calls',
      'Priority support',
      'VIP event access',
    ],
  },
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MENTOR: 'mentor',
  USER: 'user',
} as const;

export const LEARNING_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export const EVENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

export const EVENT_TYPES = {
  WEBINAR: 'webinar',
  WORKSHOP: 'workshop',
  NETWORKING: 'networking',
  MASTERCLASS: 'masterclass',
  Q_AND_A: 'q_and_a',
} as const;

export const RESOURCE_TYPES = {
  TEMPLATE: 'template',
  GUIDE: 'guide',
  CHECKLIST: 'checklist',
  SPREADSHEET: 'spreadsheet',
  VIDEO: 'video',
  ARTICLE: 'article',
} as const;

export const RESOURCE_CATEGORIES = {
  PROPERTY_FINDING: 'property_finding',
  FINANCE: 'finance',
  LEGAL: 'legal',
  MARKETING: 'marketing',
  NEGOTIATION: 'negotiation',
  MANAGEMENT: 'management',
} as const;

export const COMMUNITY_CATEGORIES = {
  GENERAL: 'general',
  STRATEGIES: 'strategies',
  DEALS: 'deals',
  INVESTING: 'investing',
  MINDSET: 'mindset',
  OFF_TOPIC: 'off_topic',
} as const;

export const NOTIFICATION_TYPES = {
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  EVENT_REMINDER: 'event_reminder',
  NEW_CONTENT: 'new_content',
  COMMUNITY_REPLY: 'community_reply',
  LEADER_MESSAGE: 'leader_message',
} as const;

export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'Email already registered',
  EMAIL_NOT_VERIFIED: 'Email not verified',
  UNAUTHORIZED_ACCESS: 'You do not have permission to access this resource',
  INVALID_TOKEN: 'Invalid or expired token',
  SESSION_EXPIRED: 'Session expired, please login again',
  INTERNAL_ERROR: 'An internal error occurred',
  INVALID_PAYMENT: 'Payment processing failed',
  INSUFFICIENT_FUNDS: 'Insufficient funds',
} as const;

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTRATION_SUCCESS: 'Registration successful. Please verify your email.',
  EMAIL_VERIFIED: 'Email verified successfully',
  PASSWORD_RESET: 'Password reset successful',
  PROFILE_UPDATED: 'Profile updated successfully',
  PASSWORD_UPDATED: 'Password updated successfully',
} as const;

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: '15m', // 15 minutes
  REFRESH_TOKEN: '7d', // 7 days
  VERIFICATION_TOKEN: '24h', // 24 hours
  PASSWORD_RESET_TOKEN: '1h', // 1 hour
} as const;

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[\d\s\-\+\(\)]{10,}$/,
  URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
} as const;

export const FILE_LIMITS = {
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  DOCUMENT_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  VIDEO_MAX_SIZE: 500 * 1024 * 1024, // 500MB
} as const;

export const INVESTMENT_FOCUSES = [
  'Residential Buy-to-Let',
  'Commercial Property',
  'Development',
  'Holiday Lets',
  'Student Accommodation',
  'Industrial',
  'Mixed Use',
] as const;

export const REGIONS = [
  'London',
  'South East',
  'South West',
  'Midlands',
  'East',
  'North West',
  'North East',
  'Scotland',
  'Wales',
  'Northern Ireland',
] as const;
