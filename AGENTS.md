<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

(The block above is a stock template note and doesn't apply to this repo —
it's an Express/TypeScript API, not Next.js. Left untouched on purpose;
everything below is the real, PBT-specific guidance.)

# Working on `pbt-enterprise-api`

You are one contributor in a long line — human or AI, this session or the
fiftieth. This file is the fast-start version of the rules. The full
reasoning behind every rule here lives in `docs/`:

1. **`docs/ENGINEERING_CONSTITUTION.md`** — why PBT exists, product
   philosophy, the vision.
2. **`docs/ARCHITECTURE_HANDBOOK.md`** — how the system is actually built:
   module shape, route conventions, auth/tier gating, pricing, billing,
   known gaps between the Constitution's vision and today's reality.
3. **`docs/DOMAIN_BIBLE.md`** — what things mean: tiers, roles, the
   terminology mapping between what a member sees and what the code calls
   it, the member lifecycle.

**Read the Architecture Handbook and Domain Bible before writing any code
that touches auth, tiers, pricing, or billing.** Both documents exist
specifically because those four areas have real, non-obvious traps (dead
parallel systems, inconsistent tier-string casing, a described-but-not-built
Entitlement Service) that have already cost real debugging time once. Don't
re-discover them.

## Non-negotiables

- **Follow the module shape exactly**: `routes/ → controllers/ → services/ →
  schemas/ → validators/`, one folder per feature under `src/modules/`. See
  Architecture Handbook §2.2.
- **Follow the route file convention exactly**: `router.use(authenticate[,
  authorize(...)])` before the routes it gates, one `router.<method>(...)`
  call per endpoint. The live Swagger docs (`GET /api/docs`) are generated
  by statically parsing route files against this exact shape
  (`src/docs/openapi/`) — deviating breaks auto-discovery of your new
  endpoint, silently. See Architecture Handbook §2.3 and §2.9.
- **Every response goes through `ResponseHandler`.** Never hand-roll
  `res.json(...)`.
- **Tier gating**: call `subscriptionService.canAccessTier(userId, tier)`
  directly where you need it. Do not build against `entitlementsMiddleware`
  (unmounted, dead) or the `memberships` module (orphaned parallel system —
  see Architecture Handbook §2.4). If you're unsure which module you're in,
  you want `subscriptions`, not `memberships`.
- **Stripe Prices are immutable.** Never try to edit one. New price = new
  Stripe Price object + archive the old one. See Architecture Handbook §2.5.
- **Before considering any feature done**: `npx tsc --noEmit` must show no
  *new* errors (a pre-existing ~60-error baseline exists and is documented
  in the Architecture Handbook §2.10 — don't chase those down as your bug,
  but don't add to the count either), and the feature must be live-tested
  against a real running server (curl for API-only work; a real browser via
  Playwright for anything the frontend consumes) — not just "it compiles."
- **Commit in logical sections**, not one giant diff at the end. Each
  commit should be independently reviewable and buildable.
- **Never invent a new gating/permission mechanism** without updating
  `ARCHITECTURE_HANDBOOK.md` §2.4 in the same change — that section's whole
  purpose is to be the one place this is explained, and it goes stale the
  moment a second, undocumented mechanism appears.
