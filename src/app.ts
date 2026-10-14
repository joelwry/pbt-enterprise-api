import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from '@/config/environment';
import { errorHandler, notFoundHandler } from '@/core/middleware/errorHandler';
import logger from '@/core/logger/logger';
import { setupSecurityMiddleware } from '@/core/middleware/securityMiddleware';
import healthRoutes from '@/core/health/health.routes';
import { buildOpenApiSpec } from '@/docs/openapi/build-spec';

// swagger-ui-express has no published types; typing it inline avoids
// depending on ts-node reliably picking up our own ambient .d.ts (it doesn't).
const swaggerUi: {
  serve: express.RequestHandler[];
  setup: (doc: Record<string, unknown>, opts?: Record<string, unknown>) => express.RequestHandler;
} = require('swagger-ui-express');

// Routes
import authRoutes from '@/modules/auth/routes/auth.routes';
import learningRoutes from '@/modules/learning/routes/learning.routes';
import membershipRoutes from '@/modules/memberships/routes/membership.routes';
import subscriptionRoutes from '@/modules/subscriptions/routes/subscription.routes';
import eventsRoutes from '@/modules/events/routes/events.routes';
import resourcesRoutes from '@/modules/resources/routes/resources.routes';
import leadersRoutes from '@/modules/leaders/routes/leaders.routes';
import powerTeamRoutes from '@/modules/power-team/routes/power-team.routes';
import communityRoutes from '@/modules/community/routes/community.routes';
import progressRoutes from '@/modules/progress/routes/progress.routes';
import bookmarkRoutes from '@/modules/bookmarks/routes/bookmark.routes';
import journeyRoutes from '@/modules/journeys/routes/journey.routes';
import introductionRoutes from '@/modules/introductions/routes/introduction.routes';
import storyRoutes from '@/modules/stories/routes/story.routes';
import questionRoutes from '@/modules/questions/routes/question.routes';
import mentorRoutes from '@/modules/mentorship/routes/mentor.routes';
import insightRoutes from '@/modules/insights/routes/insight.routes';
import dashboardRoutes from '@/modules/dashboard/routes/dashboard.routes';
import recommendationRoutes from '@/modules/recommendations/routes/recommendation.routes';
import activityRoutes from '@/modules/activity/routes/activity.routes';
import opportunityRoutes from '@/modules/opportunities/routes/opportunity.routes';
import adminLearningRoutes from '@/modules/admin-learning/routes/admin-learning.routes';
import adminEventsRoutes from '@/modules/admin-events/routes/admin-events.routes';
import adminResourcesRoutes from '@/modules/admin-resources/routes/admin-resources.routes';
import adminLeadersRoutes from '@/modules/admin-leaders/routes/admin-leaders.routes';
import adminPowerTeamRoutes from '@/modules/admin-power-team/routes/admin-power-team.routes';
import adminCommunityRoutes from '@/modules/admin-community/routes/admin-community.routes';
import adminSubscriptionsRoutes from '@/modules/admin-subscriptions/routes/admin-subscriptions.routes';
import membershipBenefitsRoutes from '@/modules/membership-benefits/routes/membership-benefits.routes';
import referralRoutes from '@/modules/referrals/routes/referral.routes';
import adminReferralsRoutes from '@/modules/admin-referrals/routes/admin-referrals.routes';
import adminMembersRoutes from '@/modules/admin-members/routes/admin-members.routes';
import billingRoutes from '@/modules/billing/routes/billing.routes';
import { billingController } from '@/modules/billing/controllers/billing.controller';
import { catchAsync } from '@/core/middleware/asyncHandler';
import pricingRoutes from '@/modules/pricing/routes/pricing.routes';
import adminPricingRoutes from '@/modules/pricing/routes/admin-pricing.routes';
import siteSettingsRoutes from '@/modules/site-settings/routes/site-settings.routes';
import adminSiteSettingsRoutes from '@/modules/site-settings/routes/admin-site-settings.routes';
import adminDashboardRoutes from '@/modules/admin-dashboard/routes/admin-dashboard.routes';
import adminUsersRoutes from '@/modules/admin-users/routes/admin-users.routes';
import adminAnalyticsRoutes from '@/modules/admin-analytics/routes/admin-analytics.routes';

export function createApp(): Application {
  const app = express();

  // ==================== SECURITY MIDDLEWARE ====================
  if (config.ENABLE_HELMET === 'true') {
    app.use(helmet({
      contentSecurityPolicy: false, // We handle CSP separately
      crossOriginEmbedderPolicy: false,
    }));
  }

  app.use(cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  }));

  // ==================== COMPRESSION ====================
  app.use(compression());

  // ==================== STRIPE WEBHOOK (raw body, must precede express.json()) ====================
  // Stripe's signature is computed over the exact bytes it sent -- parsing
  // this as JSON first and re-serializing it would almost certainly change
  // whitespace/key order and break verification. This one route is
  // registered here, ahead of the global JSON parser below, so Express hands
  // it the untouched raw body instead.
  app.post(
    `/api/${config.API_VERSION}/billing/webhook`,
    express.raw({ type: 'application/json' }),
    catchAsync((req, res) => billingController.webhook(req, res))
  );

  // ==================== BODY PARSERS ====================
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use(cookieParser());

  // ==================== ADVANCED SECURITY MIDDLEWARE ====================
  setupSecurityMiddleware(app);

  // ==================== HEALTH CHECK ROUTES ====================
  app.use(healthRoutes);

  // ==================== LOCAL UPLOADS (dev/test storage only) ====================
  // helmet's default Cross-Origin-Resource-Policy: same-origin (set above) blocks the
  // frontend -- a different origin in dev, and likely a different subdomain/host in any
  // real deployment too -- from ever rendering these as <img>/<video> at all. These are
  // meant to be publicly embeddable uploaded assets, so relax it just for this path.
  app.use('/uploads', (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });
  app.use('/uploads', express.static('uploads'));

  // ==================== API ROUTES ====================
  app.use(`/api/${config.API_VERSION}/auth`, authRoutes);
  app.use(`/api/${config.API_VERSION}/learning`, learningRoutes);
  app.use(`/api/${config.API_VERSION}/memberships`, membershipRoutes);
  app.use(`/api/${config.API_VERSION}/subscriptions`, subscriptionRoutes);
  app.use(`/api/${config.API_VERSION}/membership`, membershipBenefitsRoutes);
  app.use(`/api/${config.API_VERSION}/referrals`, referralRoutes);
  app.use(`/api/${config.API_VERSION}/events`, eventsRoutes);
  app.use(`/api/${config.API_VERSION}/resources`, resourcesRoutes);
  app.use(`/api/${config.API_VERSION}/leaders`, leadersRoutes);
  app.use(`/api/${config.API_VERSION}/power-team`, powerTeamRoutes);
  app.use(`/api/${config.API_VERSION}/community`, communityRoutes);
  app.use(`/api/${config.API_VERSION}/progress`, progressRoutes);
  app.use(`/api/${config.API_VERSION}/bookmarks`, bookmarkRoutes);
  app.use(`/api/${config.API_VERSION}/journeys`, journeyRoutes);
  
  // Sprint 4 - Community & Ecosystem
  app.use(`/api/${config.API_VERSION}/introductions`, introductionRoutes);
  app.use(`/api/${config.API_VERSION}/stories`, storyRoutes);
  app.use(`/api/${config.API_VERSION}/questions`, questionRoutes);
  app.use(`/api/${config.API_VERSION}/mentors`, mentorRoutes);
  app.use(`/api/${config.API_VERSION}/insights`, insightRoutes);
  
  // Sprint 5 - Experience Layer
  app.use(`/api/${config.API_VERSION}/dashboard`, dashboardRoutes);
  app.use(`/api/${config.API_VERSION}/recommendations`, recommendationRoutes);
  app.use(`/api/${config.API_VERSION}/activity`, activityRoutes);
  app.use(`/api/${config.API_VERSION}/opportunities`, opportunityRoutes);

  // Admin — content management
  app.use(`/api/${config.API_VERSION}/admin/learning`, adminLearningRoutes);
  app.use(`/api/${config.API_VERSION}/admin/events`, adminEventsRoutes);
  app.use(`/api/${config.API_VERSION}/admin/resources`, adminResourcesRoutes);
  app.use(`/api/${config.API_VERSION}/admin/leaders`, adminLeadersRoutes);
  app.use(`/api/${config.API_VERSION}/admin/power-team`, adminPowerTeamRoutes);
  app.use(`/api/${config.API_VERSION}/admin/community`, adminCommunityRoutes);
  app.use(`/api/${config.API_VERSION}/admin/subscriptions`, adminSubscriptionsRoutes);
  app.use(`/api/${config.API_VERSION}/admin/members`, adminMembersRoutes);
  app.use(`/api/${config.API_VERSION}/admin/referrals`, adminReferralsRoutes);
  app.use(`/api/${config.API_VERSION}/billing`, billingRoutes);
  app.use(`/api/${config.API_VERSION}/pricing`, pricingRoutes);
  app.use(`/api/${config.API_VERSION}/admin/pricing`, adminPricingRoutes);
  app.use(`/api/${config.API_VERSION}/site-settings`, siteSettingsRoutes);
  app.use(`/api/${config.API_VERSION}/admin/site-settings`, adminSiteSettingsRoutes);
  app.use(`/api/${config.API_VERSION}/admin/dashboard`, adminDashboardRoutes);
  app.use(`/api/${config.API_VERSION}/admin/admin-users`, adminUsersRoutes);
  app.use(`/api/${config.API_VERSION}/admin/analytics`, adminAnalyticsRoutes);

  // ==================== SWAGGER DOCUMENTATION ====================
  // Spec is (re)built from the live route files on every server start -- see
  // src/docs/openapi/build-spec.ts. Nothing here needs updating when a new
  // route file is added; add it to route-manifest.ts instead.
  const openApiSpec = buildOpenApiSpec();
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { customSiteTitle: 'PBT Enterprise API Docs' }));
  app.get('/api/docs.json', (req: Request, res: Response) => res.json(openApiSpec));

  // ==================== ERROR HANDLING ====================
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
