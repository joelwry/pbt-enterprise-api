# PBT Architecture Handbook

**Companion to `ENGINEERING_CONSTITUTION.md`.** The Constitution says *why* and
*how we think*; this document says *how the system is actually built today*.
Where the two disagree, this document wins for "what do I do right now" —
then go fix the gap, because the Constitution is the target, not fiction.

This is written for the next contributor with zero context: human or AI,
new hire or session #47. If you're about to touch this codebase, read this
first. It will save you from re-discovering things the hard way.

---

## 1. The Two Repositories

| Repo | What it is | Branch convention |
|---|---|---|
| `pbt-enterprise-api` | Express + TypeScript + MongoDB backend | feature branch per phase of work |
| `pbt-frontend` | Next.js (App Router) + TypeScript frontend, member portal + admin portal in one app | matching branch name, kept in lockstep with the API it depends on |

They deploy separately and talk over HTTP + JSON only. Never import code
across the repo boundary. If both need the same constant (e.g. tier names),
it is duplicated deliberately in each repo, not shared via a package.

---

## 2. Backend Architecture

### 2.1 Stack

Express 4, TypeScript (strict mode), Mongoose 9 (MongoDB), Zod for request
validation, JWT (access + refresh) for auth, Stripe for billing, Winston for
logging, `express-rate-limit` + `helmet` + `express-mongo-sanitize` for
security middleware, Cloudinary for file storage.

### 2.2 Module shape (non-negotiable)

Every feature lives under `src/modules/<name>/` with this exact shape:

```
modules/<name>/
  routes/<name>.routes.ts        # Router wiring only, no logic
  controllers/<name>.controller.ts  # Parses req, calls service, calls ResponseHandler. Nothing else.
  services/<name>.service.ts     # All business logic lives here
  schemas/<Name>.schema.ts       # Mongoose schema + TS interface
  validators/<name>.validators.ts   # Zod schemas for request bodies/params
```

A controller method should be 3-6 lines: validate input (via a Zod schema
from `validators/`), call one service method, hand the result to
`ResponseHandler`. If a controller has an `if` statement doing business
logic, that logic belongs in the service instead.

Admin-only variants of a feature get their own sibling module
(`admin-events`, `admin-pricing`, ...) rather than branching inside the
member-facing one — see §2.4. This means some business logic is genuinely
duplicated between a module and its `admin-*` counterpart; that's an
accepted tradeoff for keeping admin authorization boundaries structurally
obvious (a whole file requires `authorize('admin', 'super_admin')`, not a
scattered `if (req.user.role === 'admin')`).

### 2.3 Route file convention

Every route file follows one of these two shapes — **the Swagger doc
generator (`src/docs/openapi/`) depends on this convention being followed
exactly**, so don't get creative here:

```ts
// All routes in the file need auth:
router.use(authenticate);                              // or: router.use(authenticate, authorize('admin', 'super_admin'));
router.get('/', catchAsync((req, res) => c.list(req, res)));

// A mix of public and protected routes in one file:
router.get('/plans', controller.getAvailablePlans);     // public
router.use(authenticate);                                // everything below this line requires auth
router.get('/current', controller.getCurrentSubscription);
```

Rules that matter, learned the hard way (see git history — several of these
were real bugs before this note existed):

- **Specific routes before param routes.** `/leaders/regions/list` must be
  registered before `/leaders/:leaderId`, or Express swallows it as an id
  lookup. Grep for "must be registered before" comments in route files for
  the list of places this has bitten us.
- Controllers are wrapped in `catchAsync(...)` (or, in older modules, use
  `asyncHandler` and are defined as arrow-function class properties
  instead — both patterns exist, both work, don't mix them within one
  file).
- The one exception to "routes only get wired here": the Stripe webhook
  (`POST /api/v1/billing/webhook`) is mounted directly in `app.ts`, ahead of
  the global `express.json()` parser, because Stripe's signature
  verification needs the untouched raw request body. It is deliberately
  *not* in `billing.routes.ts`.

### 2.4 Auth: roles vs. tiers (read this before writing any gate)

Two completely different axes of access control exist and are **not**
interchangeable:

- **Role** (`User.role`): `member | admin | super_admin | visitor`. Checked
  with `authenticate` (verifies the JWT, sets `req.user`) and `authorize(...role)`
  middleware in route files. This gates *who can call an admin endpoint at
  all*. See `src/core/middleware/authMiddleware.ts`.
- **Tier** (`Subscription.tier`): `pathway | plus | mentorship`. Checked
  with `subscriptionService.canAccessTier(userId, requiredTier)`, called
  directly inside individual services/controllers wherever a piece of
  content or a feature needs to be tier-gated (see `events.service.ts`,
  `power-team.controller.ts`, `membership-benefits.controller.ts`,
  `resources.service.ts`). This gates *what a logged-in member can see*.

**There is no centralized Entitlement Service actually wired up**, despite
the Constitution (Ch. 9) describing one as the ideal. A real `entitlements`
module exists (`src/modules/entitlements/`) but:
- `entitlementsMiddleware.ts` is never mounted on any route — dead code.
- `entitlements.service.enhanced.ts` is used for exactly two things:
  `compareFeatures` and `getUpgradeSuggestions` on the `/subscriptions`
  endpoints. It is not the gating mechanism for anything else.

If you're adding a new tier-gated feature, call
`subscriptionService.canAccessTier(userId, 'Plus')` (note: **capitalized**
tier name here — see the casing trap below) directly in your service or
controller, matching the existing pattern. Do not invent a new gating
helper, and do not try to route it through `entitlementsMiddleware` — it
isn't real yet. If someone does build the centralized service the
Constitution describes, this section (and every `canAccessTier` call site)
needs to be updated together, atomically, not left half-migrated.

**Casing trap:** `subscriptionService.canAccessTier()` takes
`'Pathway' | 'Plus' | 'Mentorship'` (capitalized) and lower-cases it
internally to compare against `Subscription.tier`, which is stored as
`'pathway' | 'plus' | 'mentorship'` (lowercase). The pricing module
(`pricingService`, `billing.validators.ts` tier params) also mixes both
casings depending on context — check the type signature at each call site,
don't assume.

**Dead parallel system — do not use:** `src/modules/memberships/` (the
`Membership` schema, `MembershipTier` type, `membershipService`) is a
second, independent tier-tracking system with its own `canAccessTier`,
using capitalized tier strings throughout. It is mounted at
`/api/v1/memberships` but **nothing in the frontend calls it, and nothing
else in the backend imports `membershipService`**. It predates the real
`subscriptions` + Stripe billing system and was never removed. Do not build
new features against it. If you're touching subscription/tier logic and
land in this file by mistake, that's a sign you're in the wrong module —
you want `src/modules/subscriptions/`.

### 2.5 Pricing (dynamic, admin-overridable)

`src/modules/pricing/` — see also `src/docs/openapi/enriched-paths.ts` for
the full request/response shapes.

- Fixed defaults live in code (`PricingService.DEFAULT_MONTHLY`): Pathway
  £99, Plus £249, Mentorship £449 per month, ex-VAT. Annual pricing is
  computed from these, not hardcoded separately — check `pricing.service.ts`
  for the exact multiplier before assuming.
- `TierPricing` is an **append-only** collection (`isActive`/`isDefault`
  flags), not a single mutable row per tier/cycle — every admin price
  change is a new document, giving a real audit trail via
  `GET /admin/pricing/:tier/:billingCycle/history`.
- **Stripe Prices are immutable.** `setPricing()` always creates a brand
  new Stripe Price and archives (`active: false`) the superseded one. Never
  try to "edit" a Price object — Stripe doesn't support it, and neither
  does this codebase.
- Lazy self-healing seed: `PricingService.ensureSeeded()` creates the
  Stripe Product/Price + DB row for a tier/cycle the first time anything
  asks for it. Called once (best-effort, non-blocking) at server startup
  via `ensureAllSeeded()`, and implicitly again on every
  `getEffectivePrice()` call — so a fresh database or a missing Stripe key
  at boot time self-heals on the next real request instead of crashing
  startup.
- Prices are created in Stripe with `tax_behavior: 'exclusive'`. Automatic
  Stripe Tax collection is **deliberately not enabled** — "+VAT" is static
  UI copy, not a computed tax line. Turning on `automatic_tax` requires the
  client's own Stripe Tax registration, which is their business decision,
  not ours to force silently.

### 2.6 Billing (Stripe)

`src/modules/billing/` + `src/core/payments/StripeService.ts`.

Two entry points, both create a Stripe Checkout Session and return its URL:
- `POST /billing/signup-checkout` — public, brand-new visitor. Account is
  created by the webhook handler on successful payment, not before.
- `POST /billing/checkout-session` — authenticated, existing member
  renewing or changing tier.

The webhook (`billingService.handleWebhookEvent`) is the only place a
subscription actually gets activated/renewed/changed in the database — the
Checkout Session endpoints only ever *start* a payment. When testing
locally, a Checkout Session succeeding in the Stripe-hosted page does
**not** mean anything happened in our database until the webhook fires;
use the Stripe CLI (`stripe listen --forward-to localhost:5000/api/v1/billing/webhook`)
to get real webhook delivery in dev.

The amount recorded on a member's own `Subscription.amount` at signup/renewal
time is the *actual charged amount* (`session.amount_total`), not a live
lookup of "current" pricing — so if an admin changes pricing later, existing
members' billing history still reflects what they actually paid. Always
prefer the subscription document's own `amount`/`billingCycle` over a fresh
pricing lookup when displaying a member's own billing info.

### 2.7 Response envelope

Every endpoint responds through `ResponseHandler` (`src/core/response/ResponseHandler.ts`):

```ts
{ success: boolean, message: string, data?: T, errors?: string[], pagination?: PaginationMeta }
```

Never hand-roll `res.json(...)` in a controller — use `ResponseHandler.ok/created/paginated/error/...`
so every response shape stays consistent (the generic Swagger doc entries
for un-enriched endpoints assume this envelope).

### 2.8 Validation & errors

- Request bodies/params are validated with Zod schemas in each module's
  `validators/`, called as `someSchema.parse(req.body)` directly in the
  controller (throws on failure, caught by the global error handler — no
  manual try/catch needed per controller).
- Domain errors extend `AppError` (`src/core/errors/AppError.ts`):
  `AuthenticationError` (401), `AuthorizationError` (403),
  `NotFoundError` (404), `ValidationError` (400), etc. Throw them directly;
  `catchAsync`/`asyncHandler` forwards them to `errorHandler` middleware,
  which maps them to the right status code and `ResponseHandler.error` shape.

### 2.9 API documentation

`GET /api/docs` (Swagger UI) and `GET /api/docs.json` (raw OpenAPI 3.0) are
generated fresh from the live route files on every server start —
`src/docs/openapi/build-spec.ts`. There is no hand-maintained spec file to
keep in sync. If you add a new route file, add one line to
`src/docs/openapi/route-manifest.ts` (mount path → file → tag) and it
appears automatically with correct auth/role detection. For request/response
schemas beyond the generic auto-detected shape, add an entry to
`src/docs/openapi/enriched-paths.ts` keyed by `"METHOD /mount/path"`.

### 2.10 Known gaps / things marked "not real yet"

Documenting these honestly so nobody re-discovers them by accident:

- The centralized Entitlement Service (§2.4) doesn't exist. Gating is ad hoc.
- The `memberships` module (§2.4) is dead legacy code still mounted and
  reachable, but unused by anything real.
- Backend ESLint is configured (`npm run lint`) but `eslint` itself is not
  currently installed in `node_modules` in this environment — `npm run lint`
  will fail with a module-resolution error until that's fixed. `tsc --noEmit`
  works and is the enforced gate in the meantime.
- `npx tsc --noEmit` on a clean checkout reports a pre-existing baseline of
  ~60 errors unrelated to any feature work (missing `axios`/`clsx`/`tailwind-merge`
  type declarations pulled in by a stray `src/lib/` that looks like it was
  copy-pasted from the frontend, plus some `strict`-mode class-property
  initializer complaints in `core/dto/`). These predate this document; when
  touching any file on that list, fix forward, but don't treat their
  pre-existing presence as something you broke.

---

## 3. Frontend Architecture

### 3.1 Stack

Next.js (App Router), TypeScript, TanStack React Query for all server state,
React Hook Form + Zod for forms, Radix UI primitives + Tailwind for
components, Axios for HTTP, Framer Motion for animation.

**Read `AGENTS.md` in the frontend repo before writing any code** — this
Next.js version has real breaking changes from the training-data version of
Next.js; the repo's own docs under `node_modules/next/dist/docs/` are the
ground truth, not your priors.

### 3.2 Feature-folder convention

Every feature lives under `src/features/<name>/` with this shape (not every
feature needs every folder — a read-only feature might skip `hooks/services`
and go straight from repository to component):

```
features/<name>/
  types.ts                 # TS types matching the backend's response shape
  repositories/<name>.repository.ts   # Raw HTTP calls (axios), one function per endpoint
  services/<name>.service.ts          # Client-side formatting/derivation (e.g. formatAmount, buildLabel)
  hooks/use-<name>.ts                 # React Query hooks wrapping the repository
  components/<name>-*.tsx             # UI
```

Route pages under `src/app/` stay thin — they import a feature's top-level
view component and render it, no logic in the page file itself.

Admin features are separate sibling folders (`admin-pricing` next to
`pricing`, `admin-site-settings` next to `site-settings`), mirroring the
backend's admin-module split (§2.2) — same reasoning: keep the
admin/member boundary structurally obvious, accept some duplication.

### 3.3 Internal identifier vs. display label

When product wording needs to be admin-editable (e.g. "Workshop" → "Deal
Clinic"), only the **rendered text** becomes dynamic — route paths
(`/workshops`), component names (`WorkshopsPromoCard`), and internal type
literals (`format: 'Workshop'` on an event) stay exactly as they are. Fetch
the live label via `useSiteSettings()` and interpolate it only into JSX
text content. This has been the pattern for every rename so far
("My Learning" → "PBT Pathway", "Mentorship" → "PBT Masterplan Programme",
"Workshop" → "Deal Clinic") — don't go rename the underlying identifiers
just because the product name changed; that's a much bigger, riskier diff
for zero benefit, and it breaks anything that assumed the old identifier
was stable (badge-color lookup maps keyed by the internal value, for one).

### 3.4 React Query + effect-based state seeding

The ESLint config enforces `react-hooks/set-state-in-effect` — calling
`setState` synchronously inside a `useEffect` to sync fetched data into
local edit state is a build error, not a warning. The established fix: split
the component so the form only mounts once real data exists (parent does
`isLoading || !data ? <Skeleton/> : <Form initial={data} />`), so the child's
`useState(initialValue)` lazy initializer runs on a genuine first mount
instead of needing a `useEffect` re-sync. See
`admin-site-settings/components/terminology-settings-card.tsx` for a
worked example (`AdminSettingsCard` → inner `TerminologyForm` split).

### 3.5 Loading-state design choice

Not every hook needs the same loading-state shape. `usePricing()` exposes a
loading state because a wrong/zero price is a real, visible bug. `useSiteSettings()`
is designed to always return a safe fallback string (`workshopLabel` defaults
to `"Deal Clinic"`) synchronously, so consuming components never need
loading-state branching just to render a text label — a stale label for a
few hundred milliseconds is invisible and harmless, unlike a stale price.
Match this judgment call when adding new site-wide settings: does a wrong
value for a moment matter, or not?

---

## 4. Local Development

### 4.1 Running both repos

```
pbt-enterprise-api: npm run dev   (nodemon + ts-node, default port 5000)
pbt-frontend:        npm run dev   (Next.js dev server, default port 3000)
```

MongoDB must be running locally (`mongodb://127.0.0.1:27017/pbtDb` by
default — see `.env`). Seed scripts live in `src/scripts/` on the backend
(`seed-test-members.ts` and friends) for known-good test accounts.

### 4.2 Known environment gotchas (real, hit repeatedly this session)

- **`ts-node` does not reliably pick up ambient `.d.ts` declaration files**
  the way a full `tsc --noEmit` project build does, even when both use the
  same `tsconfig.json`. If you add an untyped npm package and are tempted to
  write `src/types/<package>.d.ts`, know that `npm run dev` (nodemon +
  ts-node) may still fail to compile with a `TS7016` error even though
  `npx tsc --noEmit` is clean. The reliable fix: type the import as `any`
  inline instead of relying on ambient declarations —
  `const pkg: SomeShape = require('package-name');` — see the
  `swagger-ui-express` import in `app.ts` for a real example.
- **A `cd` inside one Bash command does not persist to the next tool call**
  reliably across parallel/independent invocations in some tool-calling
  setups. Always confirm `pwd` before running `tsc`/`npm` commands if you're
  not certain which repo's shell state you're in — a "wall of errors" from
  the wrong repo is a common false alarm, not a real regression.
- **Nodemon's own logs claiming "Server running on http://localhost:5000"
  do not guarantee that port is reachable from every shell/tool in this
  environment** — a process started in one shell session can end up
  unreachable from another due to namespace differences after a session
  resume/compaction. If curl gets "connection refused" despite recent
  "server running" log lines, kill and restart the dev server fresh from
  the shell you're actually testing from, rather than assuming the app is
  broken.
- Stale test data from earlier synthetic testing (fake Stripe customer IDs,
  subscriptions left in `expired` state from an old test run) can cause
  confusing "No such customer" errors against real Stripe test-mode keys.
  Re-run the relevant seed script to restore known-good state rather than
  debugging the "bug" for too long.

---

## 5. Where to Go Next

- **What PBT means** (tiers, roles, terminology, member lifecycle): `DOMAIN_BIBLE.md`
- **Why we build this way**: `ENGINEERING_CONSTITUTION.md`
- **What an endpoint actually accepts/returns**: `GET /api/docs` on a running backend
