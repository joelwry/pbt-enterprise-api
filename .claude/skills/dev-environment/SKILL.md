---
name: dev-environment
description: Use when starting local development on pbt-enterprise-api, when the dev server won't respond, when you need known-good test accounts, or when tsc/ts-node give confusingly different results. Covers real, previously-hit environment gotchas -- not generic Node.js advice.
---

# pbt-enterprise-api dev environment

## Starting the server

```
npm run dev   # nodemon + ts-node, default port 5000 (see .env PORT)
```

Requires MongoDB reachable at the connection string in `.env`
(`mongodb://127.0.0.1:27017/pbtDb` by default) and, for anything touching
billing/pricing, real Stripe test-mode keys already set in `.env`
(`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`) — Price/Product ids are
**not** env vars anymore, they live in the `TierPricing` collection and
self-seed on first use (see `docs/ARCHITECTURE_HANDBOOK.md` §2.5).

## "Server running" in the logs but curl gets connection refused

Real, repeated issue in this environment: a nodemon process started in one
shell/session can become unreachable from a different shell after a
session resume or compaction, even though its own logs keep claiming
`🚀 Server running on http://localhost:5000`. The log line is not proof of
reachability from *your current shell*.

Fix: don't debug the app first. Kill anything already running and start
fresh from the shell you're actually going to test from:

```bash
# find real backend processes without matching your own grep/pgrep invocation
ps aux | grep -i "server.ts" | grep -v grep | grep -v "pgrep\|bash -c"
kill -9 <pids>
nohup npm run dev > /tmp/backend-dev.log 2>&1 &
disown
sleep 8 && tail -40 /tmp/backend-dev.log   # confirm "Server running" appears
curl -s --max-time 8 http://127.0.0.1:5000/health   # confirm it's actually reachable
```

Only treat it as a real app bug if the fresh start still doesn't respond.

## ts-node vs. `tsc --noEmit` disagree about types

`npx tsc --noEmit` (full project build) reads `tsconfig.json`'s `include`
glob and picks up every file, including ambient `.d.ts` declarations that
nothing imports. `ts-node` (used by `npm run dev`) does not reliably do the
same — an untyped package can typecheck clean under `tsc --noEmit` but
crash `npm run dev` with `TS7016: Could not find a declaration file`.

Don't fight this by tweaking `tsconfig.json` — type the import inline
instead:

```ts
const pkg: { someMethod: (x: string) => void } = require('untyped-package');
```

See the `swagger-ui-express` import in `src/app.ts` for a real, working
example of this exact fix.

## Confirm which repo's directory a shell command actually ran in

`cd` inside one Bash tool call does not reliably persist to the next call,
especially across parallel invocations. Running `npx tsc --noEmit` right
after a `cd` into the sibling `pbt-frontend` repo (or vice versa) produces a
wall of unrelated pre-existing errors that looks exactly like a regression
in the repo you meant to check. Always run `pwd` immediately before
`tsc`/`npm`/`git` commands if there's any doubt, rather than trusting the
previous command's `cd`.

## Known test accounts

Seeded via `npx ts-node -r tsconfig-paths/register src/scripts/seed-test-members.ts`
(re-run this if a test account's subscription state looks wrong — earlier
synthetic testing can leave stale `expired` subscriptions or fake Stripe
customer ids behind, which cause confusing real "No such customer" errors
against real Stripe test-mode keys):

| Email | Tier | Notes |
|---|---|---|
| `test.pathway@pbt.test` | Pathway | |
| `test.plus@pbt.test` | Plus | |
| `test.masterplan@pbt.test` | Mentorship | |
| `test.pathway.expired@pbt.test`, `test.plus.expiring@pbt.test`, etc. | various | edge-case lifecycle states — see the script for the full list |

All share the password `TestPass123!` (the script's default; pass
`--password=` to override).

Admin accounts are separate — create one with:

```
npx ts-node -r tsconfig-paths/register src/scripts/create-admin.ts \
  --email=admin@pbt.test --password=Passw0rd! --name="Ada Admin" --role=admin
```

(`--role=super_admin` for full access including admin-user management.)

## Verifying the API without a frontend

`GET /api/docs` is a live Swagger UI — Authorize with a real access token
(from `POST /api/v1/auth/login`) and use Try it out on any endpoint,
public or protected. `GET /api/docs.json` gives the raw OpenAPI spec for
scripting against. This is faster than hand-writing curl commands for
anything with a non-trivial request body.
