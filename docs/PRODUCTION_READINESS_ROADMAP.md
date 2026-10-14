# Production Readiness Roadmap

Honest status as of this session, across both repos. "Done" means built
*and* verified live against a real running app — not just present in code.
Everything under "What's Left" was checked directly (grep/read against the
actual current code), not recalled from memory.

---

## What's Actually Done

**Member portal**: registration/login/logout with real session
invalidation, password reset via email, profile editing, change-password
(new this session), Dashboard, PBT Pathway learning roadmap with real
progress tracking, dedicated Plus/Masterplan content areas, Events
(RSVP/capacity/tier-gating), Resources (tier-gated downloads), Community
Group, Referral Hub with real reward tracking, Power Team (tier-gated),
real Stripe Checkout for signup/upgrade/downgrade/renewal, dynamic
admin-editable pricing, branded PDF receipt downloads (new this session).

**Admin portal**: real-data Dashboard and Analytics (no more mock
numbers), full Member management (CRUD, real tier/status incl. lapsed
subscriptions), Content/Roadmap management with type-specific editors,
Events/Resources/Community/Leaders/Power Team CRUD, Subscriptions &
Billing overview, Referral management with payout workflow, Admin Users &
Roles, Site Settings (admin-editable terminology).

**Cross-cutting**: tier-gating enforced server-side on individual
lesson/resource endpoints (not just hidden in the UI — this was a real
bypass, closed this session), admin and member logout genuinely invalidate
sessions, Swagger/OpenAPI docs with live try-it-out, per-repo
`AGENTS.md`/architecture docs so a new session doesn't relitigate settled
decisions.

---

## What's Left Before Production

### Payments & Money
- **VAT is displayed but never calculated or collected.** The member
  subscription page shows "£X + VAT/month," but nothing in the codebase
  computes a VAT amount or configures Stripe Tax — Stripe charges exactly
  the base price. Either wire up real VAT (Stripe Tax, or a manual rate)
  or remove the misleading "+VAT" copy. This also means the new receipt
  PDF deliberately shows no VAT line, since showing one would be
  fabricated.
- **No stored payment-method details** (card brand/last4). The receipt
  shows a generic "Card" — if the business wants "Visa •••• 4242" style
  display, that needs Stripe PaymentMethod API integration and a decision
  on where to store/cache it.
- **`failedPaymentsCount` is a hardcoded 0** in admin billing stats — no
  webhook handling for actual failed-payment events yet.
- **Real production Stripe keys** aren't set anywhere verified in this
  session — test-mode keys were verified working; production launch needs
  live keys + a live webhook endpoint confirmed reachable from Stripe.

### Admin Portal Gaps
- **Admin's own Profile → Personal Information and Notification
  Preferences are still fully mocked** (`admin-profile.repository.ts`) —
  only Security/change-password was wired to a real endpoint this
  session. An admin editing their name/phone/notification settings sees a
  save succeed but nothing persists past a page reload.
- **Granular admin permissions aren't enforced server-side.** The
  Admin Users & Roles screen lets you assign `adminRole` and
  `adminSections` to an admin account, and these are genuinely saved to
  the database — but the actual `authorize()` middleware that gates every
  admin API route only checks the coarse `role` field
  (`admin`/`super_admin`), never `adminSections`. A "Content Manager"
  admin currently has the same API access as any other `admin` — the
  section restriction is cosmetic in the UI only.

### Testing & Quality
- **Test coverage is almost entirely absent outside the referral
  module.** Only 4 test files exist in the whole backend, all scoped to
  referrals; auth, subscriptions, events, tier-gating, and every admin
  module have zero automated tests. The frontend has no test files at
  all. Manual/live QA (including the sweep documented in
  `LIVE_QA_AGENT_PROMPT.md`) is currently the only verification method.
- **No CI pipeline** in either repo (no `.github/workflows`) — nothing
  runs tests, typecheck, or lint automatically on push/PR.

### Security & Compliance
- **No error-tracking/monitoring service** (Sentry or equivalent) wired
  into either repo — a production error currently only surfaces in
  server logs, which nobody is watching in real time.
- **No Terms of Service, Privacy Policy, or Cookie Consent** pages exist
  anywhere in the frontend. Standard requirement before collecting real
  payments and personal data from UK/EU consumers.
- **Duplicate admin refresh-token call** flagged by the last QA pass,
  likely React Strict Mode double-invocation in dev — needs one
  confirmation run against a real production build (`next build && next
  start`) to rule out before it's dismissed for good.
- Rate limiting is in place (`express-rate-limit`) but throws a startup
  warning about IPv6 key generation in this dev environment
  (`ERR_ERL_KEY_GEN_IPV6`) — worth a quick look at the `trust proxy`
  config once real production infrastructure (load balancer/reverse
  proxy) is known, since the warning's advice depends on that setup.

### Infrastructure & Ops
- **Deployment target unconfirmed in this session** — architecture docs
  reference Render/Railway (backend) + Vercel (frontend) as the intended
  split, but nothing here confirms either is actually provisioned with
  production environment variables (real `MONGODB_URI` on Atlas, real
  `JWT_SECRET`s, real `SMTP_*`, real `STRIPE_*`, `CORS_ORIGIN` matching
  the real frontend domain).
- **File storage**: swappable between local disk and Cloudinary
  (confirmed working), but local disk storage doesn't survive a redeploy
  on most hosts — confirm `STORAGE_PROVIDER=cloudinary` with real
  credentials is what's actually configured for production.
- **No confirmed database backup strategy** for the production MongoDB
  instance.
- **SMTP isn't configured in this dev environment** — `EmailService` is
  correctly built and no-ops safely without it, but real transactional
  email (welcome, password reset, receipts if ever emailed) needs real
  SMTP credentials set before launch.

---

## Suggested Order of Attack

1. **VAT decision** — either implement it for real or remove the
   misleading copy. This is the one item that's actively showing
   something false to paying members right now.
2. **Production infrastructure + env vars** — confirm real hosting, real
   secrets, real Stripe live keys, real SMTP, real Cloudinary. Nothing
   else matters if this isn't real.
3. **Terms/Privacy/Cookie pages** — legal minimum before real signups.
4. **Granular admin permission enforcement** — currently a false sense of
   security for whoever assigns restricted admin roles.
5. **Test coverage + CI** — not blocking for a first launch, but the
   longer it's deferred, the more expensive every future change gets.
6. **Error tracking** — cheap to add, high value once real users hit
   real bugs you won't otherwise hear about.
7. **Admin profile completeness + failed-payment tracking** — real gaps,
   lower urgency than the above.

Everything not listed above (the "What's Actually Done" section) has been
built and live-verified against a real running instance of the app, not
just written and assumed correct.
