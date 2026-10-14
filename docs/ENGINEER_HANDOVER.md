# PBT Platform — Engineer Handover

**Written:** 18 August 2026, by the QA engineer who has now run three full
verification passes over this platform.
**For:** the next full-stack engineer picking up `pbt-enterprise-api` +
`pbt-frontend`.

This document is deliberately **not** a re-explanation of the architecture.
The repos already contain excellent conventions docs and you should read
them first (§2). What they don't contain — and what has repeatedly cost real
time — is the *operational reality*: how to actually get the thing running,
what state the platform is in today, and the specific traps that have caught
every engineer and agent who has touched it, including me. That's what this
is.

---

## 1. What you're inheriting, in one paragraph

PBT is a membership portal for a UK property-investment training business.
Two repos, deployed separately, talking only over HTTP: an Express/TypeScript
API (`pbt-enterprise-api`, port 5000) and a Next.js member + admin portal
(`pbt-frontend`, port 3000). Members pay monthly via Stripe for one of three
tiers, and the entire product is essentially *"the right content unlocked for
the right tier at the right time"* — structured lessons on a drip schedule,
live events, downloadable resources, a community forum, and directories of
vetted people. Everything hangs off tier gating, so that's the part you must
never break.

**The platform is in good shape.** Over three QA rounds, 22 findings were
raised and 22 were fixed, most of them properly rather than superficially.
It is not yet production-ready, but the remaining gaps are specific and
listed in §5.

---

## 2. Read these before writing code — in this order

Both repos carry an `AGENTS.md` that is genuinely worth reading, and the
backend has a real `docs/` folder. **These are the source of truth and they
override anything I say here.**

| Document | Why |
|---|---|
| `pbt-enterprise-api/AGENTS.md` | The non-negotiables, in short form. Read first. |
| `docs/ARCHITECTURE_HANDBOOK.md` | How the system is really built. §2.2 module shape, §2.3 route conventions, §2.4 the dead parallel systems, §2.5 Stripe pricing, §2.10 the pre-existing tsc error baseline. |
| `docs/DOMAIN_BIBLE.md` | What words mean. **Read before touching any tier, role or member-facing label.** |
| `pbt-frontend/AGENTS.md` | Feature-folder shape and the frontend non-negotiables. |

Three things from those docs that you will get wrong if you skim them:

1. **Display names ≠ internal names, on purpose.** The tier stored as
   `Mentorship` is shown to members as **"PBT Masterplan Programme"**
   everywhere. The content type `Workshop` renders as **"Deal Clinic"** —
   and that label is admin-editable at runtime from Site Settings. When a
   label changes, **only the rendered text changes**: routes, component
   names and type literals stay put.
2. **Use `subscriptions`, never `memberships`.** The `memberships` module is
   an orphaned parallel system, and `entitlementsMiddleware` is unmounted
   and dead. Tier checks go through `subscriptionService.canAccessTier()`.
3. **There is a pre-existing `tsc --noEmit` error baseline** (~60 errors).
   Don't chase them as your bug; don't add to them either.

---

## 3. Getting it running — the steps that actually work

This environment has bitten every agent that assumed the happy path. In
order:

```bash
# 1. MongoDB. There is no local mongod — use Docker.
#    The docker daemon is often NOT running; start it first.
sudo dockerd > /tmp/dockerd.log 2>&1 &
sleep 8
docker start pbt-mongo 2>/dev/null || \
  docker run -d --name pbt-mongo -p 27017:27017 mongo:7

# 2. Backend
cd pbt-enterprise-api
npm install
# NOTE: there is no .env.example, despite README.md and START_HERE.md both
# telling you to copy one. Create .env by hand from §3.1 below.
npm run dev            # nodemon + ts-node, port 5000
curl -s localhost:5000/health   # must return {"status":"healthy"...}

# 3. Frontend
cd ../pbt-frontend
npm install
# .env.local MUST contain this or every API call 404s:
echo 'NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1' > .env.local
npm run dev            # port 3000
```

### 3.1 Minimum backend `.env`

There is no `.env.example` to copy. `MONGODB_URI` must be a parseable URL and
both JWT secrets must be ≥32 characters, or the app refuses to boot (Zod
validation on startup):

```
NODE_ENV=development
PORT=5000
API_VERSION=v1
MONGODB_URI=mongodb://127.0.0.1:27017/pbtDb
MONGODB_DB_NAME=pbtDb
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Use `localhost:3000`, not `127.0.0.1:3000`,** in the browser. The dev
config only allow-lists `localhost`, and via `127.0.0.1` the page renders but
is completely inert — every button silently does nothing. If you ever see a
page that looks right and responds to nothing, check the URL bar before
debugging anything else.

### 3.2 Seed data

The database starts completely empty of content. Accounts:

```bash
npx ts-node -r tsconfig-paths/register src/scripts/seed-test-members.ts
npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts \
  --email=admin@pbt.test --password='Passw0rd!' --name="Ada Admin" --role=super_admin
```

All seeded members share `TestPass123!`:

| Email | Tier / state |
|---|---|
| `test.pathway@pbt.test` | Pathway, active |
| `test.plus@pbt.test` | Plus, active |
| `test.masterplan@pbt.test` | Mentorship, active |
| `test.*.expired@pbt.test` | expired — redirected to renew |
| `test.*.expiring@pbt.test` | active, ending soon |

**There is no content seed script.** Lessons, events and resources must be
created through the admin portal, and there's a dependency order:
**Roadmap → Week → Module → Lesson**. The lesson form's Year and Module
dropdowns are empty until a roadmap and module exist. Build the roadmap
first at `/admin/content/roadmaps`.

---

## 4. Traps that have already cost time

Every one of these is something I hit personally across three rounds. None
are documented elsewhere.

**Environment**
- The docker daemon is frequently down. `Cannot connect to the Docker daemon`
  means start `dockerd`, not that Mongo is broken.
- A stale `npm run dev` from an earlier shell can keep logging
  "Server running" while being unreachable from your shell. Kill everything
  and restart from the shell you're testing in before debugging the app.
- `cd` does not reliably persist between tool calls. Run `pwd` before any
  `tsc`/`npm`/`git`. Running `tsc --noEmit` from the wrong repo produces a
  wall of unrelated errors that looks exactly like a regression.

**This sandbox specifically** (may not apply on your machine)
- **Outbound SMTP is blocked.** `smtp.gmail.com:587` times out. To test
  email properly, run a local catcher on `127.0.0.1:1025` (the `smtp-server`
  npm package works well) and point `SMTP_HOST`/`SMTP_PORT` at it — you can
  then read the actual message bodies and click the real links.
- **Stripe's hosted checkout is unreachable from the browser**
  (`ERR_CONNECTION_RESET`), even though the backend reaches `api.stripe.com`
  fine. You can verify session creation via the Stripe API and drive the
  post-payment path by signing your own webhook events, but you cannot
  complete a card payment here.
- **There is no public ingress.** You cannot receive real Stripe webhooks.
  Use `stripe listen --forward-to localhost:5000/api/v1/billing/webhook`.

**Writing tests / automation against the UI**
These cost me three false findings, all of which I nearly reported as bugs:
- **Icon-only buttons.** The community reply submit and the invoice download
  are `<button>` elements with no text, only `aria-label` ("Send reply",
  "Download receipt …"). A text-based selector silently matches nothing and
  it looks like the feature is broken. Select by `aria-label` or position.
- **Substring-colliding radio labels.** "Plus & Masterplan Programme only"
  contains "Masterplan Programme only". A `hasText` match picks the wrong
  tier and you'll conclude tier saving is broken. Match exactly.
- **Admin "Add X" controls are links, not buttons** (`<a href="/admin/events/new">`).
- **Tabs render lazily.** The admin Community page shows nothing under
  "All Posts" until that tab is actually clicked and given time to load.
- `mongosh --eval 'print(doc._id)'` prints `ObjectId("...")` including the
  wrapper. Use `._id.toString()` or every URL you build 404s/500s.

---

## 5. Current state — what's done and what isn't

### Verified working (tested in a real browser, three rounds)
- **Auth**: register, login, logout genuinely invalidates the refresh cookie,
  password change, and a full password-reset journey (email → link → reset).
  Reset tokens are hashed at rest, single-use, and the endpoint resists user
  enumeration.
- **Tier gating**: enforced server-side on lessons, resource downloads and
  event RSVPs. Clean 403s in every direction, clean 200s for entitled tiers,
  expired members cut off at the API. This is the strongest part of the
  codebase — treat it as the reference pattern.
- **Admin permissions**: granular per-section, enforced server-side via
  `adminSections`.
- **Content chain**: Roadmap → Week → Module → Lesson, with drip scheduling,
  all reflected correctly on the member side.
- **Events**: RSVP/un-RSVP, capacity "Full" state shown before clicking,
  today-vs-past split correct.
- **Community**: posting, replies, likes (de-duplicated), reporting
  (de-duplicated), and a full admin moderation view with body + replies.
- **Billing artefacts**: real branded PDF receipts with correct member data;
  Stripe checkout sessions correct; webhook signature verification solid and
  idempotent on replay.
- **Site Settings**: admin-editable terminology propagates to members live.

### Outstanding — start here

Ordered by what I'd fix first.

1. **Nothing ever cancels a subscription in Stripe.** `StripeService` has no
   cancel method, and no code path anywhere calls one. Both the member-facing
   "Cancel Subscription" and the duplicate-checkout supersede logic only
   update the local Mongo record. A member who cancels keeps being charged
   indefinitely; a member with two checkouts is charged twice while the admin
   UI shows one active subscription. **This is the most serious open issue.**
2. **Uploaded files are served unauthenticated.** `/uploads` is
   `express.static` with no auth and no tier check, so any resource file is
   fetchable by URL by anyone, forever, regardless of tier. Filenames are
   UUIDs and directory listing is off, so it isn't enumerable — but the URL
   is handed to every entitled member and can be shared freely, and raising a
   resource's tier later doesn't revoke it. Needs signed/expiring URLs (or
   Cloudinary authenticated delivery once that's live).
3. **Reset tokens remain in git history.** Logging was fixed and `/logs` is
   now gitignored, but four real tokens are still recoverable from
   `logs/app.log` at commit `96f2102`. They're expired test-account tokens so
   the practical risk is low, but the history should be purged before this
   repo is shared more widely or made public.
4. **Cloudinary needs real credentials.** The provider and local-disk
   fallback are built and verified working; it currently falls back to disk.
   Local disk will not survive a container restart on most hosts.
5. **SMTP needs production credentials** (`SMTP_HOST/USER/PASS/FROM`). The
   code path is verified; only delivery is unproven.

### Known non-issues — don't "fix" these
- **A Masterplan-only event appearing in a Pathway member's list** with a
  disabled "Requires Mentorship" button is deliberate upselling. RSVP is
  correctly 403 server-side.
- **A cancelled subscription keeping access until the period end** is correct
  business behaviour.
- **The `<!-- BEGIN:nextjs-agent-rules -->` block at the top of the backend
  `AGENTS.md`** is a stock template artefact and does not apply — the backend
  is Express, not Next.js. It's left in place deliberately.

---

## 6. Testing reality

Be aware of how thin the automated safety net is:

- **Backend: 4 test files, all in the referrals module.** `npm test` runs
  Jest. Nothing covers auth, tiers, billing, content or community.
- **Frontend: zero tests.**

So `tsc` passing tells you very little. The project convention — and it is a
good one — is that **a feature is not done until it has been exercised in a
real browser against a running server**, covering the golden path plus at
least one edge case (empty state, error state, or the tier boundary).

If you add tests, the highest-value targets by far are tier gating and the
billing/webhook paths, in that order.

---

## 7. A suggested first week

1. Get both servers running and seeded, and click through the member portal
   as each tier until the product makes sense. An hour here saves days.
2. Read `ARCHITECTURE_HANDBOOK.md` §2.2–§2.5 properly.
3. Fix the Stripe cancellation gap (§5.1). It's self-contained, high value,
   and will teach you the billing module and webhook flow.
4. Then the `/uploads` access control (§5.2).
5. Add a test around tier gating while it's all fresh.

---

## 8. Where to get unstuck

- **API surface**: `GET /api/docs` is a live Swagger UI generated by
  statically parsing route files. If your new endpoint doesn't appear there,
  you deviated from the route-file convention — that's the signal.
- **What a term means**: `docs/DOMAIN_BIBLE.md`.
- **Why something is built the way it is**: `docs/ARCHITECTURE_HANDBOOK.md`.
- **Environment weirdness**: `.claude/skills/dev-environment/SKILL.md` in the
  backend repo, plus §3 and §4 above.

Good luck. The foundations here are genuinely solid — the tier gating and
the content model in particular are better than most codebases at this
stage. Most of what's left is billing plumbing and operational hardening.
