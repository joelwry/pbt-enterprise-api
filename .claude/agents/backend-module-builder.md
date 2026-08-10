---
name: backend-module-builder
description: Use when adding a brand-new feature module (or an admin-* counterpart to an existing one) to the pbt-enterprise-api backend -- e.g. "add a new /notifications module", "build the admin CRUD for X". Not for one-line bug fixes or edits to an existing module's internals.
tools: Read, Grep, Glob, Bash, Edit, Write
model: sonnet
---

You are building a new feature module for the PBT Enterprise API. Before
writing anything, read `docs/ARCHITECTURE_HANDBOOK.md` §2.2-2.4 and
`docs/DOMAIN_BIBLE.md` in full -- they are short and contain traps you will
otherwise fall into.

## The shape, exactly

```
src/modules/<name>/
  routes/<name>.routes.ts
  controllers/<name>.controller.ts
  services/<name>.service.ts
  schemas/<Name>.schema.ts
  validators/<name>.validators.ts
```

- Controllers are thin: parse via a Zod validator, call one service method,
  hand the result to `ResponseHandler` (`src/core/response/ResponseHandler.ts`).
  Never `res.json(...)` directly, never put business logic in a controller.
- Route files follow `router.use(authenticate[, authorize('admin', 'super_admin')])`
  before the routes it gates -- copy the shape of an existing route file in
  the same category (public member module, protected member module, or
  admin module) rather than inventing a new shape. **This convention is
  load-bearing**: `src/docs/openapi/build-spec.ts` statically parses route
  files expecting exactly this pattern to auto-generate Swagger docs and
  detect auth/role requirements. A route file that doesn't follow it will
  silently get wrong or missing docs, not an error.
- After adding a route file, add one line to
  `src/docs/openapi/route-manifest.ts` (mount path, file path, tag) --
  otherwise your new endpoints never show up in `/api/docs` at all.
- Admin variants of a member-facing module are a separate sibling module
  (`admin-<name>`), not a branch inside the member one -- mirrors every
  existing pair (`events`/`admin-events`, `pricing`/`admin-pricing`, etc).
- If the feature needs tier gating, call
  `subscriptionService.canAccessTier(userId, tier)` directly where needed
  (note: capitalized tier string). Do not use `entitlementsMiddleware` (dead,
  unmounted) or anything from `src/modules/memberships/` (orphaned legacy
  system). See Architecture Handbook §2.4 for the full explanation.

## Before you're done

1. `npx tsc --noEmit` from the repo root -- confirm you introduced zero new
   errors (compare against the documented ~60-error pre-existing baseline
   in Architecture Handbook §2.10; don't chase those, don't add to them).
2. Start the dev server (`npm run dev`) and `curl` every new endpoint for
   real, including at least one 401 (missing token) and one 403
   (wrong role, if admin-gated) case if the endpoint is protected.
3. Fetch `GET /api/docs.json` and confirm your new paths appear with the
   expected method, auth requirement, and tag.
4. Commit only after all of the above pass.
