/**
 * Declarative map of every mounted router in `app.ts` to the OpenAPI tag it
 * should render under. This is the single source of truth the spec builder
 * (`build-spec.ts`) walks to discover endpoints -- add a line here whenever
 * a new router is mounted in `app.ts`, or the new routes simply won't appear
 * in the docs.
 */
export interface RouteManifestEntry {
  /** Mount path exactly as passed to `app.use()`, without the `/api/{version}` prefix (added by the builder), or the literal '' for root-mounted routers like health. */
  mountPath: string;
  /** Path to the route file, relative to `src/`. */
  file: string;
  tag: string;
  tagDescription?: string;
}

export const ROUTE_MANIFEST: RouteManifestEntry[] = [
  { mountPath: '', file: 'core/health/health.routes.ts', tag: 'Health', tagDescription: 'Liveness/readiness probes. Not versioned, not under /api/v1.' },
  { mountPath: '/auth', file: 'modules/auth/routes/auth.routes.ts', tag: 'Auth', tagDescription: 'Registration, login, token refresh, and the member/admin session.' },
  { mountPath: '/learning', file: 'modules/learning/routes/learning.routes.ts', tag: 'Learning (PBT Pathway)', tagDescription: 'Roadmap -> Week -> Module -> Lesson hierarchy and progress tracking.' },
  { mountPath: '/memberships', file: 'modules/memberships/routes/membership.routes.ts', tag: 'Memberships' },
  { mountPath: '/subscriptions', file: 'modules/subscriptions/routes/subscription.routes.ts', tag: 'Subscriptions', tagDescription: 'Plan catalogue and a member\'s own subscription lifecycle. See also Billing for Stripe Checkout and Pricing for the amounts.' },
  { mountPath: '/membership', file: 'modules/membership-benefits/routes/membership-benefits.routes.ts', tag: 'Membership Benefits' },
  { mountPath: '/referrals', file: 'modules/referrals/routes/referral.routes.ts', tag: 'Referrals' },
  { mountPath: '/events', file: 'modules/events/routes/events.routes.ts', tag: 'Events (Deal Clinic)', tagDescription: 'Member-facing events -- the in-product label for this tier of event is admin-configurable, see Site Settings.' },
  { mountPath: '/resources', file: 'modules/resources/routes/resources.routes.ts', tag: 'Resources' },
  { mountPath: '/leaders', file: 'modules/leaders/routes/leaders.routes.ts', tag: 'PBT Leaders' },
  { mountPath: '/power-team', file: 'modules/power-team/routes/power-team.routes.ts', tag: 'Power Team' },
  { mountPath: '/community', file: 'modules/community/routes/community.routes.ts', tag: 'Community' },
  { mountPath: '/progress', file: 'modules/progress/routes/progress.routes.ts', tag: 'Progress' },
  { mountPath: '/bookmarks', file: 'modules/bookmarks/routes/bookmark.routes.ts', tag: 'Bookmarks' },
  { mountPath: '/journeys', file: 'modules/journeys/routes/journey.routes.ts', tag: 'Journeys' },
  { mountPath: '/introductions', file: 'modules/introductions/routes/introduction.routes.ts', tag: 'Introductions' },
  { mountPath: '/stories', file: 'modules/stories/routes/story.routes.ts', tag: 'Stories' },
  { mountPath: '/questions', file: 'modules/questions/routes/question.routes.ts', tag: 'Questions' },
  { mountPath: '/mentors', file: 'modules/mentorship/routes/mentor.routes.ts', tag: 'Mentors' },
  { mountPath: '/insights', file: 'modules/insights/routes/insight.routes.ts', tag: 'Insights' },
  { mountPath: '/dashboard', file: 'modules/dashboard/routes/dashboard.routes.ts', tag: 'Dashboard' },
  { mountPath: '/recommendations', file: 'modules/recommendations/routes/recommendation.routes.ts', tag: 'Recommendations' },
  { mountPath: '/activity', file: 'modules/activity/routes/activity.routes.ts', tag: 'Activity' },
  { mountPath: '/opportunities', file: 'modules/opportunities/routes/opportunity.routes.ts', tag: 'Opportunities' },
  { mountPath: '/admin/learning', file: 'modules/admin-learning/routes/admin-learning.routes.ts', tag: 'Admin / Learning' },
  { mountPath: '/admin/events', file: 'modules/admin-events/routes/admin-events.routes.ts', tag: 'Admin / Events' },
  { mountPath: '/admin/resources', file: 'modules/admin-resources/routes/admin-resources.routes.ts', tag: 'Admin / Resources' },
  { mountPath: '/admin/leaders', file: 'modules/admin-leaders/routes/admin-leaders.routes.ts', tag: 'Admin / Leaders' },
  { mountPath: '/admin/power-team', file: 'modules/admin-power-team/routes/admin-power-team.routes.ts', tag: 'Admin / Power Team' },
  { mountPath: '/admin/community', file: 'modules/admin-community/routes/admin-community.routes.ts', tag: 'Admin / Community' },
  { mountPath: '/admin/subscriptions', file: 'modules/admin-subscriptions/routes/admin-subscriptions.routes.ts', tag: 'Admin / Subscriptions' },
  { mountPath: '/admin/members', file: 'modules/admin-members/routes/admin-members.routes.ts', tag: 'Admin / Members' },
  { mountPath: '/admin/referrals', file: 'modules/admin-referrals/routes/admin-referrals.routes.ts', tag: 'Admin / Referrals' },
  { mountPath: '/billing', file: 'modules/billing/routes/billing.routes.ts', tag: 'Billing', tagDescription: 'Stripe Checkout session creation. The webhook endpoint is documented here too but is not callable from Swagger (Stripe-signed only).' },
  { mountPath: '/pricing', file: 'modules/pricing/routes/pricing.routes.ts', tag: 'Pricing', tagDescription: 'Public read of the current effective price per tier/billing cycle.' },
  { mountPath: '/admin/pricing', file: 'modules/pricing/routes/admin-pricing.routes.ts', tag: 'Admin / Pricing', tagDescription: 'Override the default price per tier/billing cycle. Writes a new Stripe Price and archives the old one -- prices are never edited in place.' },
  { mountPath: '/site-settings', file: 'modules/site-settings/routes/site-settings.routes.ts', tag: 'Site Settings', tagDescription: 'Public read of site-wide wording overrides (e.g. the "Workshop" -> "Deal Clinic" label).' },
  { mountPath: '/admin/site-settings', file: 'modules/site-settings/routes/admin-site-settings.routes.ts', tag: 'Admin / Site Settings' },
  { mountPath: '/admin/dashboard', file: 'modules/admin-dashboard/routes/admin-dashboard.routes.ts', tag: 'Admin / Dashboard', tagDescription: 'Aggregate stats for the admin landing page, composed from the same real data the dedicated admin screens use.' },
  { mountPath: '/admin/admin-users', file: 'modules/admin-users/routes/admin-users.routes.ts', tag: 'Admin / Admin Users', tagDescription: 'Manage staff accounts with access to the admin portal itself. Super Admin only.' },
  { mountPath: '/admin/analytics', file: 'modules/admin-analytics/routes/admin-analytics.routes.ts', tag: 'Admin / Analytics', tagDescription: 'Platform-wide reporting, composed from real member/subscription/learning/event data.' },
];
