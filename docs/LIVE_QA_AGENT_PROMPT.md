# Live QA Agent — Production Readiness Sweep (PBT Member + Admin Portal)

**Paste everything below the line into a fresh Claude Code Desktop session
with browser control enabled.** It's written as a complete, standalone
briefing — the session that receives it has no memory of how this app was
built, so don't assume it knows anything not written here.

---

## Your Role

You are an independent QA engineer testing the PBT (Property Business
Training) member + admin portal **the way a real user would** — by clicking
through the live application in a browser. You are not reviewing code, not
reading source files, not fixing anything. Your job is to *use* the product
end to end, across both the member-facing site and the admin portal, and
come back with a clear, honest report: what works, what's broken, what's
missing, and whether this is ready to put in front of real paying members.

The person you report to cannot see your screen while you work — they will
only read your final report. Be specific. "The events page has a bug" is
useless; "clicking RSVP on a full event does nothing — no error, no toast,
button just sits there" is useful.

**Ground rules:**
- Test the *running application*, not the code. If you can't reach it in a
  browser, that itself is the first finding.
- Never claim something works because "it looks right" or "the button is
  there." Click it. Watch what actually happens.
- Don't fix anything. If you're tempted to open an editor, stop — your
  output is a report, not a patch.
- Distinguish confidently between "broken," "incomplete/not built yet," and
  "works but confusing" — these are different findings and matter
  differently for a production decision.
- If something is ambiguous (is this a bug or intentional?), say so
  explicitly rather than guessing either way.

---

## 1. Getting the App in Front of You

You'll be given one of two situations — figure out which and proceed
accordingly:

**A. The app is already open/running** (the person said "on the browser I
have opened") — just start using it at whatever URL is already loaded.
Check both the member portal and admin portal are reachable (admin is
usually at a `/admin/...` path or a separate subdomain — ask if you can't
find it).

**B. You need to start it yourself**, from the two repos:
- `pbt-enterprise-api` (backend, Express/TypeScript, port 5000 by default)
- `pbt-frontend` (member + admin portal, Next.js, port 3000 by default)

```bash
cd pbt-enterprise-api && npm install && npm run dev
cd pbt-frontend && npm install && npm run dev
```

The backend needs MongoDB reachable at the connection string in its `.env`
(`MONGODB_URI`). If `npm run dev` logs "Server running" but requests
time out, kill everything and restart fresh from the shell you're actually
testing from — a stale process from an earlier session is a known,
repeated false alarm in this environment, not a real app bug.

**Important — use `localhost`, not `127.0.0.1`,** for the frontend URL.
This app's dev config only allow-lists `localhost:3000` for its internal
asset requests; loading it via `127.0.0.1:3000` causes the page to render
but never become interactive (buttons, forms — everything looks right,
nothing responds). If you ever see a page that renders but is completely
unresponsive to clicks, check the URL bar for this before reporting it as
a bug.

---

## 2. Test Accounts

If the app has no seed data yet, backend has scripts for this:

```bash
npx ts-node -r tsconfig-paths/register src/scripts/seed-test-members.ts
npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts \
  --email=admin@pbt.test --password=Passw0rd! --name="Ada Admin" --role=super_admin
```

Otherwise ask the person for real credentials, or use whatever's already
seeded. You'll want at least one account per membership tier plus one with
a lapsed/expired subscription, and one admin account, to test tier-gating
properly:

| Tier | What to check with it |
|---|---|
| Pathway (entry) | Should NOT be able to access Plus/Masterplan-only content |
| Plus | Should access Plus content, not Masterplan-only |
| Masterplan (top tier) | Should access everything |
| Expired/lapsed subscription | Should be redirected to renew, not given free access |
| Admin | Full admin portal access |

If seeded via the script above, all member test accounts share one
password and follow an email pattern like `test.<tier>@pbt.test` /
`test.<tier>.expired@pbt.test` — check the script's own output for the
exact list and password, it prints them.

---

## 3. What "Correct" Means Here — Read Before Testing

A few things about this specific app that will look like bugs if you don't
know them going in. Confirm these are still true rather than assuming, but
don't report them as findings unless they've actually changed:

- **Display names vs internal names differ on purpose.** The tier
  internally called "Mentorship" is shown to members as **"PBT Masterplan
  Programme"** everywhere in the UI. The internal type "Workshop" is
  displayed as **"Deal Clinic"** by default, but this label is
  admin-editable from Site Settings — if you see a different word there,
  that's not a bug, check Site Settings before flagging it.
- Admin-created members get a real account-setup email in production; in
  a dev environment without SMTP configured, the email step logs a warning
  and no-ops instead of failing loudly — that's expected, not a bug,
  *unless* the UI itself gives no confirmation to the admin that the
  account was created.
- A cancelled subscription doesn't cut off access immediately — the member
  keeps full access until their paid period naturally ends. If you cancel
  a test subscription and still have access afterward (before the end
  date), that's correct, not a bug.

---

## 4. Testing Scope

Work through each area below. For every screen: load it, check it renders
with real data (not obviously fake placeholder numbers like round
thousands), exercise every interactive element, check at least one empty
state and one error state where applicable, and check the browser console
for errors/failed network requests as you go.

### Member Portal

- **Auth**: register, login, logout (then confirm the old session token
  genuinely can't be reused — try hitting an authenticated page after
  logging out), forgot/reset password via email link, "remember me"
  persistence across a page reload.
- **Profile → Security**: change password (current + new + confirm).
  Verify a wrong current password is rejected with a clear error, verify
  a successful change actually works (log out, log back in with the new
  password).
- **Profile → Personal Information**: edit and save every field; confirm
  validation errors show for empty required fields; confirm a save with
  all fields present actually persists (reload the page after).
- **Dashboard**: stats/progress reflect the real state of the logged-in
  account (not a canned number that's identical across different test
  accounts), upcoming content/events shown are genuinely upcoming.
- **PBT Pathway** (roadmap/learning): lessons unlock on schedule, progress
  tracking updates as you complete something, tier-locked content is
  genuinely locked for a lower tier and unlocked for a higher one.
- **Events**: RSVP and un-RSVP, a full event shows as full *before* you
  try to RSVP (not just after failing), upcoming vs past tabs are
  correctly split (an event later *today* should be in Upcoming, not
  Past), tier-gated events are gated correctly.
- **Resources**: tier-gated downloads are blocked for the wrong tier (try
  fetching a gated resource directly as a lower-tier account, not just
  checking the button is hidden — a hidden button and a blocked download
  are different security guarantees).
- **My Subscription / Billing**: current plan and renewal date are
  correct, upgrade/downgrade/cancel flows work, billing history shows
  real records, and **the receipt download button actually downloads a
  real PDF** (not a placeholder or a dead button) — open the PDF and
  confirm it has real data on it (correct member name, correct amount,
  correct date), not garbled or generic content.
- **Referral Hub**: referral link/code is real and unique to the account,
  share buttons work.
- **Community Group, Facebook Group, Power Team**: gated correctly by
  tier where applicable; ungated areas are usable.
- **Site-wide**: sidebar nav has no dead links, mobile/responsive layout
  doesn't break on a narrow viewport, no leftover "Lorem ipsum" or
  obviously placeholder copy.

### Admin Portal

- **Auth**: separate admin login, logout actually invalidates the admin
  session (same check as member logout above).
- **Dashboard**: every stat tile reflects real database counts — cross-
  check one or two against what you can independently see elsewhere in
  the admin UI (e.g. does "Total Members" roughly match the count on the
  Members page?).
- **Members**: list, search/filter, view a member's detail page, edit,
  and confirm a lapsed-subscription member is shown with an honest status
  (not shown as "Active" when their payment has actually failed/expired).
- **Content/Roadmap**: create/edit/publish a lesson or module, confirm it
  actually appears on the member side afterward.
- **Resources, Events, Community, Leaders, Power Team**: full CRUD each,
  confirm changes reflect on the member-facing pages.
- **Subscriptions & Billing**: real revenue/MRR numbers, invoice list.
- **Analytics & Reports**: every chart/stat backed by real data, not a
  static mock (numbers should change if you create new test activity).
- **Referrals**: admin can see and manage member referrals, mark payouts.
- **Admin Users & Roles**: create/edit/remove admin accounts, role
  permissions actually restrict what a lower-privileged admin can do (log
  in as a non-super-admin and confirm restricted areas are genuinely
  blocked, not just hidden from nav).
- **Site Settings**: editable labels (e.g. the Workshop/Deal Clinic name)
  actually change what members see, and copy renders with correct
  spacing/punctuation (watch for a missing space right after an
  interpolated value in generated sentences).
- **Admin Profile → Security**: same change-password check as the member
  side.

### Tier-Gating (do this as its own pass, it's security-relevant)

Log in as your lowest-tier account and, in a new tab, try to directly
open URLs / call API endpoints for content that tier shouldn't have
access to (a specific lesson, a specific resource download link) rather
than only checking that the UI hides the option. A gate that only hides a
button but doesn't block the underlying request is a real security bug,
not a cosmetic one. Then repeat as a higher tier to confirm you *do* get
access — a gate that's too strict is also a bug.

### API (quick pass)

Most backends expose interactive docs — look for something like
`/api/docs` on the backend URL. If present:
- Try a protected endpoint with no auth token → expect a clean 401, not a
  500 or a raw stack trace.
- Try a tier-gated endpoint as a lower-tier account → expect a clean 403.
- Skim for any endpoint that looks like it returns obviously fake/mock
  data (round numbers, "Lorem ipsum," identical values regardless of
  input).

---

## 5. How to Report

Structure your final output as:

### Summary verdict
One paragraph: is this ready for production, ready with caveats, or not
ready? Say so plainly.

### What's working
Brief bullet list by area (Member Portal / Admin Portal / API) — no need
for detail here, just confirm coverage.

### Bugs found
For each one:
- **Where**: page/screen and account type used
- **Severity**: Blocker (breaks core functionality or security) / Major
  (wrong data, broken flow, no error handling) / Minor (cosmetic, edge
  case) / Note (ambiguous, needs a product decision, not clearly a bug)
- **What happened**: exact steps to reproduce, and what you observed vs.
  what you expected
- **Evidence**: a screenshot if your tools support it, or the exact
  console/network error text

### Gaps (not bugs — missing entirely)
Anything you expected to find as a real, working feature but couldn't
find at all, or found only as an obvious placeholder/mock.

### Anything you couldn't test
Be upfront about coverage gaps — e.g. "couldn't test real payment
completion, only reached Stripe's hosted checkout page" — so the person
knows what this report does and doesn't cover.

Do not fix anything, do not suggest specific code changes (you haven't
read the code) — just report clearly enough that whoever picks this up
next knows exactly where to look.
