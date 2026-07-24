# Complete Package Installation Guide - Sprint 1, 2, & 3

This document tracks every package that needs to be installed for Sprints 1-3. Install only what you need based on which sprints you're implementing.

## Package Installation History

All packages have been installed to the project and are ready to use.

## Sprint 1 Foundation Hardening

### Environment Validation & Security

**Install Command:**
```bash
pnpm add express-rate-limit xss-clean express-mongo-sanitize envalid joi
```

| Package | Version | Purpose | Category | Status |
|---------|---------|---------|----------|--------|
| express-rate-limit | 8.5.2 | Rate limiting middleware | Security | ✅ Installed |
| express-mongo-sanitize | 2.2.0 | NoSQL injection prevention | Security | ✅ Installed |
| envalid | 8.2.0 | Environment validation | Config | ✅ Installed |
| joi | 18.2.3 | Alternative validation | Validation | ✅ Installed |

**Files Using These Packages:**
- src/config/envValidator.ts (environment validation)
- src/core/middleware/securityMiddleware.ts (rate limiting, sanitization)

**No Additional Installs Needed** - All base dependencies already in project.json

---

## Sprint 2 Identity, Membership & Entitlements

### Session Management & Async Handling

**Install Command:**
```bash
pnpm add express-async-errors@3.1.1 ioredis@5.3.2
```

| Package | Version | Purpose | Category | Status |
|---------|---------|---------|----------|--------|
| express-async-errors | 3.1.1 | Async error handling | Middleware | ✅ Installed |
| ioredis | 5.3.2 | Redis client for sessions | Cache | ✅ Installed |

**TypeScript Types:**
```bash
# If needed (types installed automatically)
pnpm add -D @types/ioredis@5.0.x
```

**Files Using These Packages:**
- src/modules/subscriptions/services/subscription.service.ts
- src/modules/sessions/services/session.service.ts
- src/modules/devices/schemas/Device.schema.ts

**Modules Added:**
- Subscriptions (4 files: schema, service, controller, routes)
- Sessions (4 files: schema, service, controller, routes)
- Devices (1 file: schema)
- Audit Logging (2 files: schema, service)

---

## Sprint 3 Knowledge & Growth Platform

### Learning Engine Dependencies

**Install Command:**
```bash
pnpm add mongoose-aggregate-paginate@2.0.2
```

| Package | Version | Purpose | Category | Status |
|---------|---------|---------|----------|--------|
| mongoose-aggregate-paginate | 2.0.2 | Advanced pagination for aggregations | Database | ✅ Installed |

**Files Using These Packages:**
- src/modules/programmes/schemas/Programme.schema.ts (pagination)
- src/modules/progress/schemas/UserProgress.schema.ts (pagination)
- src/modules/bookmarks/services/bookmark.service.ts (paginated queries)

**Modules Added:**
- Programmes (5 files: schema, service, controller, routes, utilities)
- Progress (5 files: schema, service, controller, routes, milestone)
- Bookmarks (5 files: schema, service, controller, routes, utilities)
- Journeys (5 files: schema, service, controller, routes, utilities)
- Content Relationships (3 files: schema, service, utilities)

**Utility Files Added:**
- src/core/content/ContentMapper.ts
- src/core/progress/ProgressCalculator.ts
- src/core/journey/JourneyOrchestrator.ts

---

## Complete Dependency Summary

### Total Packages to Install: 6

**Quick Install All:**
```bash
pnpm add express-rate-limit express-mongo-sanitize envalid joi \
         express-async-errors ioredis \
         mongoose-aggregate-paginate
```

### By Category

**Security & Rate Limiting (2)**
- express-rate-limit@8.5.2
- express-mongo-sanitize@2.2.0

**Environment & Validation (2)**
- envalid@8.2.0
- joi@18.2.3

**Async & Error Handling (1)**
- express-async-errors@3.1.1

**Caching & Sessions (1)**
- ioredis@5.3.2

**Database Enhancement (1)**
- mongoose-aggregate-paginate@2.0.2

### By Sprint

**Sprint 1 Only:** 4 packages
- express-rate-limit
- express-mongo-sanitize
- envalid
- joi

**Sprint 1 + Sprint 2:** 6 packages (add 2)
- + express-async-errors
- + ioredis

**Sprint 1 + 2 + 3:** 7 packages (add 1)
- + mongoose-aggregate-paginate

---

## Installation Status Verification

### Check Installed Versions

```bash
# View installed versions
pnpm list express-rate-limit
pnpm list express-mongo-sanitize
pnpm list envalid
pnpm list express-async-errors
pnpm list ioredis
pnpm list mongoose-aggregate-paginate

# Or check package.json dependencies
cat package.json | grep -E "express-rate-limit|express-mongo|envalid|express-async|ioredis|mongoose-aggregate"
```

### All Packages Currently Installed ✅

```
✅ express-rate-limit@8.5.2
✅ express-mongo-sanitize@2.2.0
✅ envalid@8.2.0
✅ joi@18.2.3
✅ express-async-errors@3.1.1
✅ ioredis@5.3.2
✅ mongoose-aggregate-paginate@2.0.2
```

---

## Package Usage in Sprints

### Sprint 1 Usage

**express-rate-limit**
```typescript
// src/core/middleware/securityMiddleware.ts
import rateLimit from 'express-rate-limit';

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
```

**express-mongo-sanitize**
```typescript
// src/core/middleware/securityMiddleware.ts
import mongoSanitize from 'express-mongo-sanitize';

app.use(mongoSanitize());
```

**envalid**
```typescript
// src/config/envValidator.ts
import { cleanEnv, str, port } from 'envalid';

const config = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'production'] }),
  MONGODB_URI: str(),
  PORT: port({ default: 5000 }),
});
```

### Sprint 2 Usage

**express-async-errors**
```typescript
// Wraps express handlers for automatic error catching
import 'express-async-errors';

app.get('/data', async (req, res) => {
  const data = await database.query(); // Errors automatically caught
  res.json(data);
});
```

**ioredis**
```typescript
// src/modules/sessions/services/session.service.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

// Store refresh tokens in Redis
await redis.set(sessionKey, token, 'EX', 7 * 24 * 60 * 60);
```

### Sprint 3 Usage

**mongoose-aggregate-paginate**
```typescript
// src/modules/progress/services/progress.service.ts
// Used internally by Mongoose for paginated aggregations
const results = await UserProgress.aggregate([...])
  .paginate({ page: 1, limit: 20 });
```

---

## Environment Variables Required

No additional environment variables needed beyond what Sprint 1 requires.

Current variables:
- NODE_ENV
- MONGODB_URI
- JWT_SECRET
- JWT_REFRESH_SECRET
- CORS_ORIGIN
- PORT
- LOG_LEVEL

Optional for Sprint 2:
- REDIS_HOST (defaults to localhost)
- REDIS_PORT (defaults to 6379)

---

## File Organization by Sprint

### Sprint 1 Files (Foundation)
```
src/
├── config/envValidator.ts
├── core/
│   ├── middleware/securityMiddleware.ts
│   ├── health/health.routes.ts
│   └── middleware/entitlementsMiddleware.ts
└── shared/
    └── errorCodes.ts
```

### Sprint 2 Files (Membership)
```
src/
├── modules/
│   ├── subscriptions/ (4 files)
│   ├── sessions/ (4 files)
│   ├── devices/ (1 file)
│   └── audit/ (2 files)
└── core/
    ├── redis/RedisClient.ts
    └── auth/enhanced auth logic
```

### Sprint 3 Files (Learning)
```
src/
├── modules/
│   ├── programmes/ (5 files)
│   ├── progress/ (5 files)
│   ├── bookmarks/ (5 files)
│   ├── journeys/ (5 files)
│   └── content/ (3 files)
└── core/
    ├── content/ContentMapper.ts
    ├── progress/ProgressCalculator.ts
    └── journey/JourneyOrchestrator.ts
```

---

## Dependency Tree

```
express (already installed)
├── express-rate-limit (Sprint 1)
├── express-mongo-sanitize (Sprint 1)
├── express-async-errors (Sprint 2)
├── cors (already installed)
├── helmet (already installed)
└── compression (already installed)

mongoose (already installed)
└── mongoose-aggregate-paginate (Sprint 3)

Config & Validation
├── dotenv (already installed)
├── envalid (Sprint 1)
├── joi (Sprint 1)
└── zod (already installed)

Session & Cache
└── ioredis (Sprint 2)
```

---

## Reinstalling Packages (If Needed)

If you need to reinstall all packages:

```bash
# Option 1: Install only what's needed for Sprints 1-3
pnpm add express-rate-limit express-mongo-sanitize envalid joi \
         express-async-errors ioredis \
         mongoose-aggregate-paginate

# Option 2: Install from package.json
pnpm install

# Option 3: Clean reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

---

## Documentation References

- **PACKAGE_MANAGEMENT.md** - Complete package tracking
- **Sprint Documentation** - SPRINT_1/2/3_COMPLETED.md files
- **API Documentation** - API_DOCUMENTATION.md
- **Package Source**:
  - https://www.npmjs.com/package/express-rate-limit
  - https://www.npmjs.com/package/express-mongo-sanitize
  - https://www.npmjs.com/package/envalid
  - https://www.npmjs.com/package/express-async-errors
  - https://www.npmjs.com/package/ioredis
  - https://www.npmjs.com/package/mongoose-aggregate-paginate

---

## Quick Reference

### For Sprint 1 Only
```bash
pnpm add express-rate-limit express-mongo-sanitize envalid joi
```

### For Sprint 1 + 2
```bash
pnpm add express-rate-limit express-mongo-sanitize envalid joi \
         express-async-errors ioredis
```

### For All Sprints (1 + 2 + 3)
```bash
pnpm add express-rate-limit express-mongo-sanitize envalid joi \
         express-async-errors ioredis \
         mongoose-aggregate-paginate
```

---

## Total Installation Impact

- **Total Packages**: 7 (6 new, many already in project)
- **Total Size**: ~3.5 MB
- **Installation Time**: ~30-60 seconds
- **Breaking Changes**: None
- **Compatibility**: Node 18+, Express 5.x, MongoDB 5.x

---

**All Sprints 1-3 packages are already installed in the project.**

Next time you start, simply run:
```bash
pnpm dev
```

No additional installations needed unless specified in new sprints.
