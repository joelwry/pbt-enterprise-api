/**
 * Hand-authored OpenAPI operation objects for the modules API consumers hit
 * first (auth, billing, pricing, site-settings, subscriptions). Everything
 * else in the API is still fully listed in the docs -- `build-spec.ts` walks
 * every router (see `route-manifest.ts`) and fills in a generic-but-correct
 * operation (method, path, params, auth requirement) for any endpoint not
 * enriched here.
 *
 * Keyed by `${METHOD} ${mountPath}${expressPathWithBraceParams}`, e.g.
 * `"POST /auth/login"`. No `/api/{version}` prefix -- the builder adds that.
 */

const API_RESPONSE = (dataSchema: Record<string, unknown>) => ({
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    message: { type: 'string' },
    data: dataSchema,
  },
});

const TIER = { type: 'string', enum: ['Pathway', 'Plus', 'Mentorship'] };
const TIER_LOWER = { type: 'string', enum: ['pathway', 'plus', 'mentorship'] };
const BILLING_CYCLE = { type: 'string', enum: ['monthly', 'annual'] };

const USER_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string', format: 'email' },
    fullName: { type: 'string' },
    role: { type: 'string', enum: ['member', 'admin', 'super_admin'] },
    tier: TIER_LOWER,
  },
};

const AUTH_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    user: USER_SCHEMA,
    tokens: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  },
};

const PRICING_ROW_SCHEMA = {
  type: 'object',
  properties: {
    tier: TIER,
    tierLabel: { type: 'string', example: 'PBT Pathway' },
    billingCycle: BILLING_CYCLE,
    amount: { type: 'number', example: 99 },
    currency: { type: 'string', example: 'gbp' },
  },
};

export interface EnrichedOperation {
  summary: string;
  description?: string;
  requestBody?: Record<string, unknown>;
  responses: Record<string, unknown>;
  parameters?: Record<string, unknown>[];
}

export const ENRICHED_PATHS: Record<string, EnrichedOperation> = {
  'GET /health/mongodb': {
    summary: 'Ping MongoDB and report database response time',
    description: 'Public, unversioned health probe. Executes a MongoDB ping command and returns its response time. Call this endpoint periodically from an external monitor if you need to keep an otherwise-idle database connection active; the endpoint does not schedule background pings.',
    responses: {
      '200': jsonResponse('MongoDB ping successful', {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy'] },
          connected: { type: 'boolean', example: true },
          responseTimeMs: { type: 'number', description: 'Time taken for the MongoDB ping, in milliseconds.' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      }),
      '503': {
        description: 'MongoDB is unavailable or the ping failed.',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                message: { type: 'string', example: 'MongoDB ping failed' },
                errors: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
    },
  },
  'POST /auth/register': {
    summary: 'Register a new member',
    requestBody: jsonBody({
      type: 'object',
      required: ['email', 'password', 'fullName'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 6 },
        fullName: { type: 'string', minLength: 2 },
        phone: { type: 'string' },
        referralCode: { type: 'string', description: "Another member's Client ID, if referred." },
      },
    }),
    responses: { '201': jsonResponse('Registration successful', AUTH_RESULT_SCHEMA) },
  },
  'POST /auth/login': {
    summary: 'Log in a member',
    requestBody: jsonBody({
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        rememberMe: { type: 'boolean', default: false },
      },
    }),
    responses: { '200': jsonResponse('Login successful', AUTH_RESULT_SCHEMA) },
  },
  'POST /auth/admin/login': {
    summary: 'Log in an admin (same credentials, enforces admin/super_admin role)',
    requestBody: jsonBody({
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        rememberMe: { type: 'boolean', default: false },
      },
    }),
    responses: { '200': jsonResponse('Login successful', AUTH_RESULT_SCHEMA) },
  },
  'POST /auth/refresh-token': {
    summary: "Exchange a refresh token for a new access token (falls back to the httpOnly cookie if the body is omitted)",
    requestBody: jsonBody({ type: 'object', properties: { refreshToken: { type: 'string' } } }),
    responses: { '200': jsonResponse('Token refreshed', AUTH_RESULT_SCHEMA) },
  },
  'GET /auth/me': {
    summary: 'Get the current authenticated user',
    responses: { '200': jsonResponse('User retrieved successfully', USER_SCHEMA) },
  },
  'POST /auth/logout': {
    summary: 'Log out (clears the refresh cookie)',
    responses: { '200': jsonResponse('Logged out successfully', { type: 'object', nullable: true }) },
  },

  'POST /billing/signup-checkout': {
    summary: 'Create a Stripe Checkout session for a brand-new visitor signing up',
    description: 'Public. On completion the Stripe webhook creates the member account and activates the subscription.',
    requestBody: jsonBody({
      type: 'object',
      required: ['fullName', 'email', 'tier', 'billingCycle'],
      properties: {
        fullName: { type: 'string', minLength: 2 },
        email: { type: 'string', format: 'email' },
        tier: TIER,
        billingCycle: BILLING_CYCLE,
        referralCode: { type: 'string' },
      },
    }),
    responses: { '200': jsonResponse('Checkout session created', { type: 'object', properties: { url: { type: 'string', format: 'uri' }, sessionId: { type: 'string' } } }) },
  },
  'POST /billing/checkout-session': {
    summary: 'Create a Stripe Checkout session for an existing member (renew / upgrade / downgrade)',
    requestBody: jsonBody({
      type: 'object',
      required: ['tier', 'billingCycle'],
      properties: { tier: TIER, billingCycle: BILLING_CYCLE },
    }),
    responses: { '200': jsonResponse('Checkout session created', { type: 'object', properties: { url: { type: 'string', format: 'uri' }, sessionId: { type: 'string' } } }) },
  },
  'POST /billing/webhook': {
    summary: 'Stripe webhook receiver',
    description: 'Not callable from this UI -- requires a valid Stripe-Signature header computed over the raw request body by Stripe itself. Use the Stripe CLI (`stripe listen --forward-to`) to exercise this locally.',
    responses: { '200': { description: 'Event processed', content: { 'application/json': { schema: { type: 'object', properties: { received: { type: 'boolean' } } } } } } },
  },

  'GET /pricing': {
    summary: 'Get the current effective price for every tier and billing cycle',
    description: 'Public. Falls back to the fixed defaults (Pathway £99, Plus £249, Mentorship £449 per month, +VAT) for any tier/cycle an admin has not overridden.',
    responses: { '200': jsonResponse('Pricing retrieved successfully', { type: 'array', items: PRICING_ROW_SCHEMA }) },
  },
  'GET /admin/pricing': {
    summary: 'List all pricing rows, including default/override provenance',
    responses: { '200': jsonResponse('Pricing retrieved successfully', { type: 'array', items: { allOf: [PRICING_ROW_SCHEMA, { type: 'object', properties: { isDefault: { type: 'boolean' }, isActive: { type: 'boolean' }, stripePriceId: { type: 'string' } } }] } }) },
  },
  'PUT /admin/pricing/{tier}/{billingCycle}': {
    summary: 'Set a custom price for a tier/billing cycle',
    description: 'Creates a new Stripe Price and archives the superseded one -- Stripe Prices are immutable, so this never edits in place.',
    requestBody: jsonBody({ type: 'object', required: ['amount'], properties: { amount: { type: 'number', exclusiveMinimum: 0, example: 129 } } }),
    responses: { '200': jsonResponse('Pricing updated successfully', PRICING_ROW_SCHEMA) },
  },
  'POST /admin/pricing/{tier}/{billingCycle}/reset': {
    summary: 'Reset a tier/billing cycle back to its fixed default price',
    responses: { '200': jsonResponse('Pricing reset to default', PRICING_ROW_SCHEMA) },
  },
  'GET /admin/pricing/{tier}/{billingCycle}/history': {
    summary: 'Full price history for a tier/billing cycle (append-only audit trail)',
    responses: { '200': jsonResponse('Pricing history retrieved successfully', { type: 'array', items: PRICING_ROW_SCHEMA }) },
  },

  'GET /site-settings': {
    summary: 'Get site-wide wording overrides',
    description: 'Public. Currently exposes `workshopLabel`, the admin-editable display name for the "Workshop" concept (defaults to "Deal Clinic").',
    responses: { '200': jsonResponse('Site settings retrieved successfully', { type: 'object', properties: { workshopLabel: { type: 'string', example: 'Deal Clinic' } } }) },
  },
  'PUT /admin/site-settings': {
    summary: 'Update site-wide wording overrides',
    requestBody: jsonBody({ type: 'object', properties: { workshopLabel: { type: 'string', minLength: 1, maxLength: 60 } } }),
    responses: { '200': jsonResponse('Site settings updated successfully', { type: 'object', properties: { workshopLabel: { type: 'string' } } }) },
  },

  'GET /subscriptions/plans': {
    summary: 'List all plans with current pricing and features',
    responses: { '200': jsonResponse('Plans retrieved successfully', { type: 'array', items: { type: 'object', properties: { tier: TIER_LOWER, name: { type: 'string' }, price: { type: 'object', properties: { monthly: { type: 'number' }, annual: { type: 'number' } } }, features: { type: 'array', items: { type: 'string' } } } } }) },
  },
  'GET /subscriptions/current': {
    summary: "Get the authenticated member's current subscription",
    responses: { '200': jsonResponse('Subscription retrieved successfully', { type: 'object', nullable: true }) },
  },
  'POST /subscriptions/upgrade': {
    summary: 'Upgrade to a higher tier',
    requestBody: jsonBody({ type: 'object', required: ['newTier'], properties: { newTier: TIER_LOWER } }),
    responses: { '201': jsonResponse('Subscription upgraded successfully', { type: 'object' }) },
  },
  'POST /subscriptions/downgrade': {
    summary: 'Downgrade to a lower tier',
    requestBody: jsonBody({ type: 'object', required: ['newTier'], properties: { newTier: TIER_LOWER } }),
    responses: { '200': jsonResponse('Subscription downgraded successfully', { type: 'object' }) },
  },
  'POST /subscriptions/cancel': {
    summary: "Cancel the authenticated member's subscription",
    responses: { '200': jsonResponse('Subscription cancelled successfully', { type: 'object', properties: { cancelled: { type: 'boolean' } } }) },
  },
};

function jsonBody(schema: Record<string, unknown>) {
  return { required: true, content: { 'application/json': { schema } } };
}

function jsonResponse(exampleMessage: string, dataSchema: Record<string, unknown>) {
  return {
    description: exampleMessage,
    content: { 'application/json': { schema: API_RESPONSE(dataSchema) } },
  };
}
