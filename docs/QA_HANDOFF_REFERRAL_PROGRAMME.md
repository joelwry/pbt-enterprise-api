# QA Handoff — Referral & Rewards Programme Rework

**Audience: an independent Claude Code agent (or human QA) with zero prior
context on this session.** Everything you need to stand the project up in
your own sandbox and verify the referral rework is here. Don't assume
anything not written down — if something is missing, that's a gap in this
document, not something you should guess at.

This document covers the referral feature specifically. For the platform's
general architecture, terminology, and non-negotiables, read (in this
order, before touching anything):

1. `docs/ENGINEERING_CONSTITUTION.md` — product philosophy.
2. `docs/ARCHITECTURE_HANDBOOK.md` — how the system is actually built.
3. `docs/DOMAIN_BIBLE.md` — what tiers/roles/terms mean.

Those three exist precisely so a new session doesn't have to reconstruct
this context from scratch. This document assumes you've read them.

---

## 1. Project Architecture

Two repositories, deployed separately, talking only over HTTP:

- **`pbt-enterprise-api`** — Express 4 + TypeScript (strict) + Mongoose 9
  (MongoDB) backend. Feature-module shape:
  `routes/ → controllers/ → services/ → schemas/ → validators/` under
  `src/modules/<name>/`.
- **`pbt-frontend`** — Next.js (App Router) + TypeScript. Member portal +
  admin portal in one app. Feature-folder shape:
  `types.ts → repositories/ → services/ → hooks/ → components/` under
  `src/features/<name>/`.

The referral feature specifically:

- Backend: `src/modules/referrals/` (member-facing: summary + own
  referrals) and `src/modules/admin-referrals/` (admin management +
  payout actions). Reward math lives in
  `src/modules/referrals/services/referral-reward.service.ts` — the single
  source of truth, nothing else computes a reward.
- Frontend: `src/features/referral-hub/` (member) and
  `src/features/admin-referrals/` (admin).
- The referral is created and qualified inside the Stripe webhook handler:
  `src/modules/billing/services/billing.service.ts` →
  `handleCheckoutCompleted()` → calls
  `referralService.recordReferralWithFirstPayment()`.

---

## 2. Install Dependencies

```bash
cd pbt-enterprise-api && npm install
cd pbt-frontend && npm install
```

Node 22 is what this was built/tested against (`node -v` to confirm your
environment).

---

## 3. Required Environment Variables

### Backend (`pbt-enterprise-api/.env`)

| Var | Required? | Notes |
|---|---|---|
| `MONGODB_URI` | Yes | e.g. `mongodb://127.0.0.1:27017/pbtDb` |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Yes | any string in dev |
| `JWT_EXPIRY`, `JWT_REFRESH_EXPIRY` | No | default `15m` / `7d` |
| `PORT` | No | default `5000` |
| `FRONTEND_URL` | No | default `http://localhost:3000`; used to build the referral link (`{FRONTEND_URL}/join?ref=<id>`) and email links |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | For real Checkout | Stripe **test-mode** keys. Without these, pricing self-heals to defaults but you cannot create a real Checkout Session -- see §12. |
| `STRIPE_WEBHOOK_SECRET` | For real Checkout | From `stripe listen` (Stripe CLI) in dev |
| `STORAGE_PROVIDER` | No | `local` in dev (writes to `uploads/`); Cloudinary vars only needed if set to `cloudinary` |
| `SMTP_*` | No | Not configured in the dev `.env` this was built against. Emails log a warning and no-op instead of sending -- see §17. |
| `CORS_ORIGIN` | No | default `http://localhost:3000` |

### Frontend (`pbt-frontend/.env.local`)

| Var | Required? | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | points at the backend, e.g. `http://localhost:5000/api/v1` |

---

## 4-6. Starting Everything

**Database** (MongoDB must be running before the backend starts):

```bash
mongod --dbpath <your-data-dir> --bind_ip 127.0.0.1 --port 27017
```

**Backend:**

```bash
cd pbt-enterprise-api
npm run dev   # nodemon + ts-node, http://localhost:5000
```

**Frontend:**

```bash
cd pbt-frontend
npm run dev   # Next.js dev server, http://localhost:3000
```

Confirm both are actually reachable before testing anything —
`curl http://localhost:5000/health` and `curl -o /dev/null -w '%{http_code}' http://localhost:3000`.
See `pbt-enterprise-api/.claude/skills/dev-environment/SKILL.md` and the
frontend's equivalent for real, previously-hit gotchas (a dev server can
look "running" in its own logs but be unreachable from a different
shell/session -- kill and restart fresh if that happens, don't assume the
app is broken).

---

## 7-9. Seed / Demo Data and Accounts

```bash
cd pbt-enterprise-api
npx ts-node -r tsconfig-paths/register src/scripts/seed-test-members.ts
npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts \
  --email=admin@pbt.test --password=Passw0rd! --name="Ada Admin" --role=admin
```

**Member accounts** (all share password `TestPass123!` unless you passed
`--password=` to the seed script):

| Email | Tier | State |
|---|---|---|
| `test.pathway@pbt.test` | Pathway | active |
| `test.plus@pbt.test` | Plus | active |
| `test.masterplan@pbt.test` | Mentorship | active |
| `test.pathway.expired@pbt.test`, `test.plus.expiring@pbt.test`, `test.masterplan.expiring@pbt.test`, `test.plus.expired@pbt.test`, `test.masterplan.expired@pbt.test` | various | lifecycle edge cases -- see the script for exact states |

**Admin**: create your own via `create-admin.ts` above (`--role=super_admin`
for full access; every admin route in this codebase currently accepts
either `admin` or `super_admin` except Admin Users & Roles management,
which is `super_admin`-only).

**Referral test data**: the seed script does not create any referrals. To
exercise the feature with real qualified data without a real Stripe
payment, call `referralService.recordReferralWithFirstPayment()` directly
from a one-off `ts-node` script (see the automated tests in
`src/modules/referrals/services/*.test.ts` for the exact call shape), or
drive a real signup through `/join?ref=<referrerUserId>` with real Stripe
test-mode keys and the Stripe CLI forwarding webhooks (§12).

---

## 10-12. Routes, Endpoints, and How to Try Them

**Live API docs**: `GET /api/docs` (Swagger UI) on a running backend --
every endpoint, auto-generated from the real route files, with
Authorize-and-try-it-out support. This is more reliable than any static
list here going stale. Use it.

**Referral-specific endpoints** (all under `/api/v1`):

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/referrals/me` | member | Own referral summary (link, totals, reward description) |
| GET | `/referrals/me/referred` | member | Own referred-members list, paginated |
| GET | `/admin/referrals/stats` | admin | Aggregate totals (earned/paid/outstanding) |
| GET | `/admin/referrals?filter=&search=&page=&limit=` | admin | Full list, filterable by lifecycle bucket |
| PATCH | `/admin/referrals/:id/payment-pending` | admin | REWARD_EARNED -> PAYMENT_PENDING |
| PATCH | `/admin/referrals/:id/mark-paid` | admin | -> PAID, body: `{paymentReference?, adminNote?}` |
| POST | `/billing/signup-checkout` | public | Real signup entry point; `referralCode` in the body is the referrer's user id |

**Frontend routes**:

| Route | Who |
|---|---|
| `/referral-hub` | member -- the redesigned hub with hero image, 10% copy, per-referral table |
| `/admin/referrals` | admin -- filterable list, Mark Processing / Mark Paid actions |
| `/join?ref=<userId>` | public signup, captures the referral code from the URL |

**Real end-to-end test with actual Stripe** (optional, needs Stripe test
keys):

```bash
stripe listen --forward-to localhost:5000/api/v1/billing/webhook
```

Then complete a signup at `http://localhost:3000/join?ref=<a real user's id>`
using a Stripe test card (`4242 4242 4242 4242`, any future expiry/CVC).
The webhook creates the account + Subscription + a `REWARD_EARNED` Referral
in one step -- refresh the referrer's Referral Hub to see it.

---

## 13. Database Collections/Models Touched by This Feature

- `referrals` (`Referral` model) — see `src/modules/referrals/schemas/Referral.schema.ts`
  for the full field list and the `ReferralStatus` enum. Unique index on
  `referredUserId` (one referral per referred person, ever).
- `users` (`User`) — unchanged by this work; `_id` doubles as the
  referral code.
- `subscriptions` (`Subscription`) — unchanged; `firstPaymentSubscriptionId`
  on a Referral points at the qualifying one, for audit/traceability only.

---

## 14. Subscription / Access Rules (unchanged by this work)

See `docs/DOMAIN_BIBLE.md` §1-2 for the full tier/role model. Nothing about
tier gating or role-based access changed as part of the referral rework.

---

## 15. Referral Business Rules (the actual spec this was built against)

- Reward = **10% of the referred customer's first payment only**, one-time,
  never recalculated from later payments, never from a tier's list price.
  £99 -> £9.90, £249 -> £24.90, £449 -> £44.90 (these are examples, not
  hardcoded outputs -- always derived from the real recorded first payment,
  which itself can differ from list price if an admin has a promo price
  active).
- Lifecycle: `REFERRED -> CUSTOMER_SIGNED_UP -> AWAITING_FIRST_PAYMENT -> FIRST_PAYMENT_RECEIVED -> REWARD_EARNED -> PAYMENT_PENDING -> PAID`.
  **In the live signup flow, account creation and first-payment
  confirmation happen atomically in one webhook call**, so a real referral
  is created directly at `REWARD_EARNED`, skipping the earlier states in
  one step -- there is no observable moment where it sits at
  `FIRST_PAYMENT_RECEIVED` separately from `REWARD_EARNED`. See the
  docstring at the top of `Referral.schema.ts` for the full reasoning.
- A referral is created exactly once per referred person (DB-enforced
  unique index), at the moment their account is created, by exactly one of
  two callers:
  1. `billingService.handleCheckoutCompleted` (real signup, always has
     payment info) -> creates the Referral already `REWARD_EARNED`.
  2. `authService.register()` (the legacy, payment-less
     `POST /auth/register` endpoint -- **not reachable from the real
     `/join` flow, which always goes through Stripe Checkout**) -> creates
     the Referral at `CUSTOMER_SIGNED_UP`, which will sit there forever
     since nothing in this codebase later confirms a payment for an
     account created this way.
- Renewals never touch the Referral collection at all -- this is what
  guarantees "no reward from recurring payments," not a special-case check.
- Idempotency: the webhook handler's own idempotency guard (skips
  redelivered events for a Stripe subscription it's already processed)
  runs *before* referral logic, plus the DB unique index is a hard backstop.
- Only `admin`/`super_admin` roles can mark a reward as paid (route-level
  `authorize(...)` middleware, not a service-level check -- see
  `src/modules/admin-referrals/routes/admin-referrals.routes.ts`).
- The portal only **records** that PBT paid a reward externally
  (`paymentReference`, `adminNote`, `paidBy`, `paidAt`); it never moves
  money itself. There is no payout integration.

---

## 16. Expected Behaviour, Feature by Feature

- **Member Referral Hub** (`/referral-hub`): hero banner image at the top,
  a "10% of first payment" pitch with worked examples, a copyable referral
  link + share buttons (unchanged from before), three stat cards (Total
  Referrals / Rewards Earned / Rewards Paid), and a table of the member's
  own referrals with plan, first payment, reward, and status. Empty state
  when they have none yet.
- **Admin Referrals** (`/admin/referrals`): four stat cards, a 6-way filter
  pill row (All / Pending / Awaiting first payment / Reward earned /
  Payment pending / Paid), a search box, and a full table with a "Mark
  Processing" and "Mark Paid" action per row once a reward is earned.
  "Mark Paid" opens a dialog showing the referral's payment/reward summary
  and optional payment reference + note fields.

---

## 17. Known Limitations (real, not hidden)

- **Email is not actually configured** in the `.env` this was built
  against (no `SMTP_*` values) -- account-setup and subscription-confirmation
  emails log a warning and no-op instead of sending. This has nothing to do
  with the referral feature specifically; it's a pre-existing platform gap.
- **Legacy referral rows from before this rework**: if the database already
  has `referrals` documents created under the old flat-£10 schema (no
  `status`, `rewardAmount: 10` for every row regardless of tier), they will
  display as best-effort "Pending" with their old flat £10 amount in both
  UIs -- Mongoose applies the new schema's `status` default
  (`'REFERRED'`) to documents missing that field, but there's no way to
  retroactively know what those old referred members' actual first payment
  was, so they were **not** migrated to a qualified state. This was
  observed live during this session's regression pass and is not a bug to
  "fix" without the client confirming what (if anything) should happen to
  that historical data.
- **The legacy `POST /auth/register` endpoint** still exists and still
  records a (permanently pending) referral if called with a referral code
  -- see §15. It is not reachable from the real product (`/join` always
  uses Stripe Checkout), but it is a real, unauthenticated-reachable API
  endpoint. Worth flagging to the client/security review if that's a
  concern; out of scope for this rework to remove.
- **No payout integration**: marking a reward "Paid" is a manual admin
  record, not a real money transfer. If the client later wants real payouts
  (bank transfer API, PayPal, etc.), `paymentReference`/`adminNote` are
  there as a landing spot but nothing calls out to a real payment provider.

## 18. Features Intentionally Using Dummy/Placeholder Data

None specific to the referral feature -- every number shown (totals,
per-referral amounts, rewards) is computed from real database records, not
placeholder data. The one seeded end-to-end example used in this session's
regression pass (`referral.demo.member@pbt.test`, referred by
`test.pathway@pbt.test`) is disposable test data, not something the app
depends on -- delete it freely.

## 19. Features Not Yet Implemented

- Bulk "mark all as paid" admin action (each referral is marked
  individually).
- CSV/export of referral data for finance reconciliation.
- Any real payout automation (see §17).
- Admin-configurable referral rate (currently a code constant,
  `REFERRAL_REWARD_PERCENTAGE = 10`, stored per-record for audit but not
  exposed as an editable setting anywhere in the UI -- the client's brief
  didn't ask for this, only for the 10%-of-first-payment *rule*, so it
  wasn't built. If the client wants this to become admin-editable later,
  follow the same pattern as `TierPricing`/`SiteSettings` documented in
  `docs/ARCHITECTURE_HANDBOOK.md`).

## 20. External Services / Credentials Needed for Full Testing

- **MongoDB** — local instance is sufficient for everything in this
  document except real Stripe payments.
- **Stripe test-mode keys** (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_WEBHOOK_SECRET`) — only needed to exercise the *real* end-to-end
  signup-with-referral flow described in §12. Everything else (unit tests,
  integration tests against a synthetic webhook event, the admin payout
  UI against seeded data) works without them.
- **Stripe CLI** (`stripe listen`) — only needed alongside real Stripe keys,
  for local webhook forwarding.
- No other external services are involved in this feature.

---

## Automated Test Coverage

Run everything:

```bash
cd pbt-enterprise-api
npm test
```

This runs against a real, isolated MongoDB database (`pbtDb_test` on the
same local Mongo instance -- see `src/testing/db.ts` and
`src/testing/jest.env.ts`), truncated between tests, **not** mocks. Tests
run serially (`maxWorkers: 1` in `jest.config.js`) since they share that
one database.

19 tests across 4 files, covering every scenario the client's spec asked
for by number:

| # | Scenario | File |
|---|---|---|
| 1-3 | Pathway/Plus/Mentorship reward math | `referral-reward.service.test.ts` |
| 4-5 | Renewals never generate a second reward, however many happen | `referral-lifecycle.integration.test.ts` |
| 6 | Duplicate/redelivered webhook doesn't duplicate the reward | `referral-lifecycle.integration.test.ts` |
| 7 | A referral with no qualifying payment stays pending | `referral-lifecycle.integration.test.ts` |
| 8 | Admin can mark an earned reward as paid | `admin-referrals.service.test.ts` |
| 9 | A normal member gets 403 trying to mark a reward paid | `admin-referrals-permissions.http.test.ts` |
| 10 | A paid referral cannot be paid again | `admin-referrals.service.test.ts` |
| 11 | A member only ever sees their own referrals | `referral-lifecycle.integration.test.ts` |

Plus extras: unauthenticated request gets 401, negative/zero payment
amounts handled correctly, marking-paid rejected before qualification.
