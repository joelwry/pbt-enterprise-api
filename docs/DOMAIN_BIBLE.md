# PBT Domain Bible

**Companion to `ENGINEERING_CONSTITUTION.md` and `ARCHITECTURE_HANDBOOK.md`.**
This is the definitive source of what PBT's business concepts actually are
in the running system today — the real enum values, the real terminology
mapping between what a member sees and what the code calls it, and the real
rules. If this document and a comment in code disagree, trust this
document and go fix the comment.

---

## 1. Membership Tiers

Three tiers, one axis, strictly ordered (higher tiers include everything
below them):

| Level | Internal value (`Subscription.tier`) | Displayed as | Default price (ex-VAT, monthly) |
|---|---|---|---|
| 1 | `pathway` | **PBT Pathway** | £99/mo |
| 2 | `plus` | **PBT Plus** | £249/mo |
| 3 | `mentorship` | **PBT Mentorship** (nav labels also say "PBT Masterplan Programme" in places — same tier, two display strings depending on context; check the component before assuming which one applies) | £449/mo |

Annual billing cycle exists for all three (`billingCycle: 'monthly' | 'annual'`);
the annual amount is computed, not independently hardcoded — see
`pricing.service.ts`.

Pricing is **admin-overridable** (see `ARCHITECTURE_HANDBOOK.md` §2.5). The
numbers above are the fixed defaults a fresh install falls back to; treat
`GET /api/v1/pricing` as the actual source of truth at any point in time,
never these numbers directly, in any UI or calculation.

**Tier casing is not consistent across the codebase.** Some code paths use
capitalized `'Pathway' | 'Plus' | 'Mentorship'`, others use lowercase
`'pathway' | 'plus' | 'mentorship'`. This is not a typo to "fix" broadly —
both are load-bearing in different modules. Check the type signature at
each call site.

### 1.1 What each tier unlocks

From `subscriptionService.getTierHierarchy()` — the actual feature list
returned to the frontend for plan comparison:

- **Pathway**: `basic-learning`, `community-access`, `resource-library`
- **Plus**: everything in Pathway, plus `premium-resources`, `event-access`
- **Mentorship**: everything in Plus, plus `mentorship-access`, `power-team-access`

In product terms, gated by `subscriptionService.canAccessTier()` at
specific call sites (not a single central table — see Architecture Handbook
§2.4):
- **Deal Clinic events** (formerly "Workshops" — see §4): gated to Plus+ (`events.service.ts`)
- **Power Team directory**: content gated to Plus+, but the nav link itself
  stays visible to Pathway members with an upgrade prompt instead of being
  hidden (`power-team.controller.ts`) — a deliberate product decision:
  Pathway members should know the feature exists.
- **Mentorship / Masterplan calls**: gated to Mentorship only (`membership-benefits.controller.ts`)
- **Resources**: individual resources can each carry their own tier
  requirement (`resources.service.ts`), not a single blanket gate — a
  Pathway member sees only resources tagged at or below their tier.

---

## 2. Roles (a completely separate axis from tiers)

`User.role`: `member | admin | super_admin | visitor`. That's the real,
complete enum (`User.schema.ts`) — not the aspirational
Member/Leader/Mentor/Admin/Super Admin list in the Constitution's Ch. 8.
"Leader" and "Mentor" are not roles in this system; they are separate
directory entities (see §5) a member can be *assigned to*, not a role a
user account *has*.

- `member` — every paying subscriber, regardless of tier.
- `admin` / `super_admin` — staff. `super_admin`-only areas exist (e.g.
  Admin Users & Roles management) but most admin endpoints accept either.
- `visitor` — reserved value on the enum; not actively assigned by any
  current signup/registration flow as far as this document's author could
  verify. Don't build logic that assumes it's populated.

Admin portal and member portal share the same `User` collection and the
same login mechanism (`authService.login`), differentiated only by checking
`role` after authenticating — `POST /auth/admin/login` is the same
credential check as `POST /auth/login` plus a server-side role check, not a
separate user store. They use differently-named refresh cookies
(`refreshToken` vs `adminRefreshToken`) purely so a staff member who is also
a member (or is testing both) doesn't clobber one session with the other in
the same browser.

Admin *sections* (a finer-grained permission layer on top of role) exist —
`AdminSection` type, checked per-nav-item in the frontend
(`admin-nav-config.ts`: `members`, `content`, `resources`, `events`,
`community`, `pbtLeaders`, `powerTeam`, `subscriptions`, `analytics`,
`referrals`). `super_admin` bypasses section checks entirely; a plain
`admin` needs the specific section granted. This is a real, live permission
system — not aspirational.

---

## 3. Member Lifecycle

1. **Signup**: a visitor picks a tier + billing cycle on the public `/join`
   page → `POST /billing/signup-checkout` → redirected to Stripe Checkout.
   No `User` document exists yet at this point.
2. **Payment completes** → Stripe fires a webhook →
   `billingService.handleWebhookEvent` creates the `User` and `Subscription`
   documents together, in that same handler. If you ever see a Checkout
   Session succeed in Stripe but no corresponding account, check webhook
   delivery first (see Architecture Handbook §2.6) — that's almost always
   the cause, not a bug in account creation logic itself.
3. **Active member**: logs in, uses the portal. Subscription
   renews/upgrades/downgrades through `POST /subscriptions/{upgrade,downgrade}`
   and `POST /billing/checkout-session` for any tier/cycle change that needs
   a new payment.
4. **Cancellation**: `POST /subscriptions/cancel` sets `cancelledAt`; the
   frontend's "cancelled" flag is computed from `Boolean(subscription.cancelledAt)`,
   not a separate status enum value — a cancelled subscription can still be
   `status: 'active'` until its `endDate` passes (cancellation takes effect
   at the end of the paid period, not immediately).
5. **Referral credit**: if the new member registered with another member's
   referral code, a `Referral` row is created crediting the referrer a flat
   reward (`rewardAmount`, defaults to £10 — **explicitly flagged in this
   session as likely to change**; don't assume this number is final product
   pricing, check with the client before building anything that assumes a
   fixed reward).

---

## 4. Terminology: Product Name vs. Internal Identifier

Some product-facing names have changed since the original build and are
kept **admin-editable** because the client is still deciding on final
wording. The pattern: internal code never changes, only the displayed
string does (see Architecture Handbook §3.3).

| Displayed today | Original/internal name | Where the mapping lives |
|---|---|---|
| PBT Pathway | "My Learning" (learning module is still literally called `learning` in code) | static rename, not admin-editable |
| PBT Masterplan Programme / PBT Mentorship | "Mentorship" (tier value `mentorship`, module `mentorship`) | static rename, not admin-editable |
| Community Group | "Community" (`community` module) | static rename, not admin-editable |
| **Deal Clinic** | "Workshop" (`format: 'Workshop'` on `Event` documents, `/workshops` route, `WorkshopsPromoCard` component) | **admin-editable** — `SiteSettings.workshopLabel`, defaults to `"Deal Clinic"`, changeable at `/admin/settings` without a redeploy |

If the client asks to rename something else the same way Workshop → Deal
Clinic was done, follow that exact pattern: add a field to `SiteSettings`,
an admin form to edit it, and thread the fetched label into JSX text only —
don't touch the underlying identifier.

---

## 5. Directory Entities (not roles, not tiers)

Two separate "who else is in this ecosystem" directories exist, easy to
confuse:

- **PBT Leaders** (`leaders` module): regional business leaders members can
  browse (`/leaders`). A Leader can be **assigned to a member** as their
  `assignedLeader` (via admin's "assign mentor" action on the Subscriptions
  & Billing screen — the UI calls this "assign mentor", the underlying
  field and data model calls it `assignedLeader`/`Leader`, there is no
  separate `Mentor` entity backing this). This is the real implementation
  of "your Mentorship-tier mentor" today.
- **Power Team** (`power-team` module): a directory of trusted external
  service providers/partners (solicitors, brokers, etc.) members can browse
  and contact — a networking/referral directory, not a mentorship
  relationship. Gated to Plus+ (see §1.1).

Do not conflate the two when a request mentions "mentor" — clarify whether
it means a PBT Leader assignment or a Power Team connection; the code
already treats them as unrelated.

---

## 6. Community & Social Features

- **Community Group** (`community` module): threaded discussion, member-created,
  with admin moderation (pin/flag/approve/remove) — a real in-app forum, not
  a redirect to Facebook.
- **Facebook Group** (`facebook-group` frontend feature): a promo/link-out
  card pointing members to an actual external Facebook group. Backend has
  no corresponding module — this is frontend-only, static content.
- **Referral Hub**: member-facing referral code sharing + tracking
  (`referrals` module) plus admin visibility (`admin-referrals`). See §3
  step 5 for the reward mechanics and its "may change" caveat.

---

## 7. Data Model Quick Reference

Collections that matter most when reasoning about a bug or a new feature
(see `ARCHITECTURE_HANDBOOK.md` §2.2 for where each module's schema file
lives):

- `users` — one document per human account, `role` + auth fields. Soft-deleted
  via `deletedAt` (a `pre('find')` hook filters these out automatically —
  don't add your own `deletedAt` filter on top, it's already handled).
- `Subscription` (not in the table above by design — it's the live,
  Stripe-backed tier/billing source of truth; do not confuse with the dead
  `memberships`/`Membership` collection, see Architecture Handbook §2.4).
- `TierPricing` — append-only pricing history, see Architecture Handbook §2.5.
- `SiteSettings` — singleton document (exactly one row, no filter needed to
  find it), holds admin-editable site-wide text like `workshopLabel`.
- `events` — single collection backing both public listing and the
  Deal-Clinic-labeled workshop calendar; `format: 'Workshop'` is the
  internal literal, never renamed (§4).
- `referrals` — one row per successfully-credited referral, not per link
  share (see schema comment in `Referral.schema.ts`).

---

## 8. Where to Go Next

- **How the system is built**: `ARCHITECTURE_HANDBOOK.md`
- **Why we build this way**: `ENGINEERING_CONSTITUTION.md`
- **Exact request/response shapes for any endpoint mentioned here**:
  `GET /api/docs` on a running backend
