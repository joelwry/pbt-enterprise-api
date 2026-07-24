# PBT Backend API - Package Management & Dependencies

## Overview

This document tracks all npm packages installed for the PBT Backend API project, organized by Sprint and phase. Use this to selectively install only the packages you need rather than reinstalling everything.

---

## Initial Setup (Bootstrap)

**Installed during project creation:**

```bash
pnpm install express mongoose dotenv cors helmet compression bcryptjs \
  jsonwebtoken zod winston cloudinary multer swagger-autogen \
  swagger-ui-express @types/express @types/node @types/bcryptjs \
  @types/jsonwebtoken @types/multer typescript ts-node nodemon
```

**Packages:**
- `express` (5.2.1) - Web framework
- `mongoose` (9.7.4) - MongoDB ODM
- `dotenv` (17.4.2) - Environment variables
- `cors` (2.8.6) - CORS middleware
- `helmet` (8.2.0) - Security headers
- `compression` (1.8.1) - Response compression
- `bcryptjs` (3.0.3) - Password hashing
- `jsonwebtoken` (9.0.3) - JWT tokens
- `zod` (4.4.3) - Schema validation
- `winston` (3.19.0) - Logging
- `cloudinary` (2.10.0) - File upload service
- `multer` (2.2.0) - File upload middleware
- `swagger-autogen` (2.23.7) - API docs generation
- `swagger-ui-express` (5.0.1) - Swagger UI
- `uuid` (9.0.x) - Unique IDs
- `@types/*` (TypeScript types)
- `typescript` (5.7.3)
- `ts-node` (10.9.2)
- `nodemon` (3.1.14)
- `tsconfig-paths` (4.2.0) - TS path mapping

**Total: 18 production + 7 dev packages**

---

## Sprint 1 - Foundation Hardening

**New packages added:**

```bash
pnpm add express-rate-limit@8.5.2 \
  express-mongo-sanitize@2.2.0 \
  envalid@8.2.0 \
  joi@18.2.3 \
  @types/cors@2.8.x \
  @types/compression@1.7.x
```

**Packages Added:**

| Package | Version | Purpose | Dev | Category |
|---------|---------|---------|-----|----------|
| express-rate-limit | 8.5.2 | DDoS/rate limiting | false | Security |
| express-mongo-sanitize | 2.2.0 | NoSQL injection prevention | false | Security |
| envalid | 8.2.0 | Environment validation | false | Config |
| joi | 18.2.3 | Schema validation (alternative) | false | Validation |
| @types/cors | 2.8.x | TypeScript types | true | Types |
| @types/compression | 1.7.x | TypeScript types | true | Types |

**Installation Command:**
```bash
pnpm add express-rate-limit@8.5.2 express-mongo-sanitize@2.2.0 envalid@8.2.0 joi@18.2.3 @types/cors @types/compression
```

**Files Added:**
- src/config/envValidator.ts
- src/core/middleware/securityMiddleware.ts
- src/core/health/health.routes.ts
- src/core/middleware/entitlementsMiddleware.ts
- src/modules/entitlements/services/entitlements.service.ts
- src/shared/errorCodes.ts

**Total Packages: +6**
**Total Size Impact: ~3.2 MB**

---

## Sprint 2 - Identity, Membership & Entitlements

**New packages to add:**

```bash
pnpm add express-async-errors@3.1.1 \
  ioredis@5.3.x \
  @types/ioredis@5.x
```

**Packages to Add:**

| Package | Version | Purpose | Dev | Category |
|---------|---------|---------|-----|----------|
| express-async-errors | 3.1.1 | Async error handling | false | Middleware |
| ioredis | 5.3.x | Redis client for refresh tokens | false | Cache |
| @types/ioredis | 5.x | TypeScript types | true | Types |

**Files to Add:**
- src/modules/subscriptions/schemas/Subscription.schema.ts
- src/modules/subscriptions/services/subscription.service.ts
- src/modules/subscriptions/controllers/subscription.controller.ts
- src/modules/subscriptions/routes/subscription.routes.ts
- src/modules/sessions/schemas/Session.schema.ts
- src/modules/sessions/services/session.service.ts
- src/modules/sessions/controllers/session.controller.ts
- src/modules/sessions/routes/session.routes.ts
- src/modules/devices/schemas/Device.schema.ts
- src/modules/devices/services/device.service.ts
- src/modules/audit/schemas/AuditLog.schema.ts
- src/modules/audit/services/audit.service.ts
- src/core/middleware/auditMiddleware.ts
- src/core/redis/RedisClient.ts

**Estimated Packages: +3**
**Estimated Size Impact: ~1.8 MB**

---

## Sprint 3 - Knowledge & Growth Platform

**New packages to add:**

```bash
pnpm add mongoose-aggregate-paginate@3.4.0
```

| Package | Version | Purpose | Dev | Category |
|---------|---------|---------|-----|----------|
| mongoose-aggregate-paginate | 3.4.0 | Advanced pagination for aggregations | false | Database |

**Files to Add:**
- src/modules/programmes/schemas/Programme.schema.ts
- src/modules/programmes/schemas/ProgrammeContent.schema.ts
- src/modules/resources/schemas/Resource.enhanced.ts
- src/modules/progress/schemas/UserProgress.schema.ts
- src/modules/progress/schemas/Milestone.schema.ts
- src/modules/content/schemas/ContentRelationship.schema.ts
- src/modules/bookmarks/schemas/Bookmark.schema.ts
- src/modules/journeys/schemas/LearningJourney.schema.ts
- src/modules/programmes/services/programme.service.ts
- src/modules/progress/services/progress.service.ts
- src/modules/progress/services/milestone.service.ts
- src/modules/content/services/contentRelationship.service.ts
- src/modules/bookmarks/services/bookmark.service.ts
- src/modules/journeys/services/journey.service.ts
- src/modules/programmes/controllers/programme.controller.ts
- src/modules/progress/controllers/progress.controller.ts
- src/modules/bookmarks/controllers/bookmark.controller.ts
- src/modules/journeys/controllers/journey.controller.ts
- src/modules/programmes/routes/programme.routes.ts
- src/modules/progress/routes/progress.routes.ts
- src/modules/bookmarks/routes/bookmark.routes.ts
- src/modules/journeys/routes/journey.routes.ts
- src/core/content/ContentMapper.ts
- src/core/progress/ProgressCalculator.ts
- src/core/journey/JourneyOrchestrator.ts

**Estimated Packages: +1**
**Estimated Size Impact: ~450 KB**
  redis@4.x \
  ioredis@5.x \
  @types/redis@4.x
```

**Packages to Add:**

| Package | Version | Purpose | Dev | Category |
|---------|---------|---------|-----|----------|
| @elastic/elasticsearch | 8.x | Full-text search | false | Search |
| neo4j-driver | 5.x | Graph relationships | false | Database |
| redis | 4.x | Caching layer | false | Cache |
| ioredis | 5.x | Redis wrapper | false | Cache |
| graphql | 16.x | GraphQL API (optional) | false | API |
| graphql-tag | 0.12.x | GraphQL utilities | false | API |
| type-graphql | 2.x | GraphQL + TypeScript | false | API |
| @types/redis | 4.x | TypeScript types | true | Types |

**Estimated Packages: +8**
**Estimated Size Impact: ~4.5 MB**

## Sprint 4 - Community & Ecosystem

**New packages to add:**

```bash
# No new packages required - uses existing libraries
```

| Package | Version | Purpose | Dev | Category |
|---------|---------|---------|-----|----------|
| (existing) | - | All modules built with Express + MongoDB | - | - |

**Files to Add:**
- src/modules/introductions/schemas/MemberIntroduction.schema.ts
- src/modules/stories/schemas/SuccessStory.schema.ts
- src/modules/questions/schemas/BusinessQuestion.schema.ts
- src/modules/mentorship/schemas/Mentor.schema.ts
- src/modules/mentorship/schemas/MentorSession.schema.ts
- src/modules/insights/schemas/IndustryInsight.schema.ts
- src/modules/introductions/services/introduction.service.ts
- src/modules/stories/services/story.service.ts
- src/modules/questions/services/question.service.ts
- src/modules/mentorship/services/mentor.service.ts
- src/modules/mentorship/services/session.service.ts
- src/modules/insights/services/insight.service.ts
- 12+ controllers and route files

**Estimated Packages: 0**
**Estimated Size Impact: ~1.2 MB**

## Sprint 5 - Experience Layer (CRITICAL)

**New packages to add:**

```bash
pnpm add bull@4.11.3
```

| Package | Version | Purpose | Dev | Category |
|---------|---------|---------|-----|----------|
| bull | 4.11.3 | Job queue for background recommendations | false | Jobs |

**Files to Add:**
- src/modules/dashboard/schemas/DashboardData.schema.ts
- src/modules/recommendations/schemas/Recommendation.schema.ts
- src/modules/activity/schemas/Activity.schema.ts
- src/modules/opportunities/schemas/Opportunity.schema.ts
- src/modules/dashboard/services/dashboard.service.ts
- src/modules/recommendations/services/recommendation.service.ts
- src/modules/activity/services/activity.service.ts
- src/modules/opportunities/services/opportunity.service.ts
- src/core/jobs/RecommendationQueue.ts
- src/core/jobs/ActivityFeedQueue.ts
- 8+ controllers and route files

**Estimated Packages: +1**
**Estimated Size Impact: ~520 KB**

## Sprint 6 - API Maturity & Standardization

**New packages to add:**

```bash
pnpm add class-validator@0.14.0 class-transformer@0.5.1 reflect-metadata@0.1.13
```

| Package | Version | Purpose | Dev | Category |
|---------|---------|---------|-----|----------|
| class-validator | 0.14.0 | Request validation | false | Validation |
| class-transformer | 0.5.1 | DTO transformation | false | Transformation |
| reflect-metadata | 0.1.13 | Reflection for decorators | false | Utility |

**Files to Add**:
- src/core/response/ResponseStandardizer.ts
- src/core/dto/base.dtos.ts
- src/core/dto/common.dtos.ts
- src/core/middleware/validateDto.middleware.ts
- src/core/versioning/* (API versioning)
- 30+ module-specific DTO files
- Updated all controllers to use ResponseStandardizer

**Estimated Packages: +3**
**Estimated Size Impact: ~1.2 MB**

## Sprint 7 - Production Excellence

**New packages already added (from Sprint 6+):**

```bash
# Already installed in previous sprints
```

| Package | Version | Purpose | Already Installed |
|---------|---------|---------|------------------|
| winston | 3.11.0 | Structured logging | Yes (3.19.0) |
| express-request-id | 1.4.1 | Request tracing | Yes |

**Files to Add**:
- src/core/logging/Logger.ts
- src/core/health/HealthCheck.ts
- src/core/security/SecurityHeaders.ts
- src/core/middleware/requestLogger.middleware.ts
- src/core/monitoring/Monitor.ts
- src/core/migrations/* (Database migrations)
- src/routes/health.routes.ts

**Estimated Packages: 0 (using already installed)**
**Estimated Size Impact: ~800 KB**

---

## Quick Install by Sprint

### Install Sprint 1 Only (Security Hardening):
```bash
pnpm add express-rate-limit express-mongo-sanitize envalid joi @types/cors @types/compression
```

### Install Sprint 2 Only (Identity & Entitlements):
```bash
pnpm add express-async-errors class-validator class-transformer reflect-metadata \
  passport passport-jwt @types/passport-jwt
```

### Install Sprint 3 Only (Knowledge Platform):
```bash
pnpm add mongoose-aggregate-paginate@2.0.2
```

### Install Sprint 4 Only (Community & Ecosystem):
```bash
# No additional packages needed
```

### Install Sprint 5 Only (Experience Layer - CRITICAL):
```bash
pnpm add bull@4.11.3
```

### Install Sprint 6 Only (API Maturity):
```bash
pnpm add class-validator@0.14.0 class-transformer@0.5.1 reflect-metadata@0.1.13
```

### Install Sprint 7 Only (Production Excellence):
```bash
# No new packages needed - uses existing winston and express-request-id
```

### Install Sprints 2-7 (Full Platform):
```bash
# Sprint 2
pnpm add express-async-errors@3.1.1 ioredis@5.3.2

# Sprint 3
pnpm add mongoose-aggregate-paginate@2.0.2

# Sprint 5
pnpm add bull@4.11.3

# Sprint 6
pnpm add class-validator@0.14.0 class-transformer@0.5.1 reflect-metadata@0.1.13
```

### Install All Sprints 1-7:
```bash
# All packages for complete platform
pnpm add express-async-errors@3.1.1 ioredis@5.3.2 mongoose-aggregate-paginate@2.0.2 bull@4.11.3 class-validator@0.14.0 class-transformer@0.5.1 reflect-metadata@0.1.13
```

---

## Package Categories & Purposes

### Security (Sprint 1)
- `express-rate-limit` - Rate limiting protection
- `express-mongo-sanitize` - NoSQL injection prevention
- `envalid` - Environment validation
- `joi` - Schema validation

### Authentication & Sessions (Sprint 2)
- `passport` - Auth framework
- `passport-jwt` - JWT strategy
- `express-async-errors` - Error handling

### Data Validation & DTO (Sprint 2)
- `class-validator` - Class-based validation
- `class-transformer` - DTO transformation
- `reflect-metadata` - Metadata support

### Search & Discovery (Sprint 3)
- `@elastic/elasticsearch` - Full-text search
- `neo4j-driver` - Graph relationships

### Caching (Sprint 3)
- `redis` - Redis client
- `ioredis` - Advanced Redis wrapper

### API Layer (Sprint 3)
- `graphql` - GraphQL runtime
- `graphql-tag` - GraphQL utilities
- `type-graphql` - Decorator-based GraphQL

---

## Total Package Summary

| Sprint | New Packages | Size | Status |
|--------|-------------|------|--------|
| Bootstrap | 18 | ~8.2 MB | ✅ Installed |
| Sprint 1 | 6 | ~3.2 MB | ✅ Installed |
| Sprint 2 | 7 | ~2.1 MB | 📋 Planned |
| Sprint 3 | 8 | ~4.5 MB | 📋 Planned |
| **TOTAL** | **39** | **~18 MB** | - |

---

## Installation Strategy

### Selective Installation (Recommended)

Install packages only for the sprints you need:

**For Backend Essentials Only:**
```bash
pnpm add express-rate-limit express-mongo-sanitize envalid joi
```

**For Identity & Auth:**
```bash
pnpm add express-async-errors class-validator class-transformer \
  reflect-metadata passport passport-jwt
```

**For Search & Caching:**
```bash
pnpm add @elastic/elasticsearch redis ioredis
```

### Full Installation

Install everything at once:
```bash
pnpm add express-rate-limit express-mongo-sanitize envalid joi \
  express-async-errors class-validator class-transformer reflect-metadata \
  passport passport-jwt @elastic/elasticsearch neo4j-driver redis ioredis \
  graphql graphql-tag type-graphql
```

---

## Notes for Production

1. **Selective Loading**: Not all packages are used in every environment
   - Search (Elasticsearch) optional in development
   - Redis optional if caching disabled
   - GraphQL optional if REST-only API

2. **Version Pinning**: All versions specified for reproducibility
   - Use exact versions in production
   - Update cautiously following SemVer

3. **Type Definitions**: Always install `@types/*` packages with their corresponding packages
   - `@types/cors`, `@types/compression`, `@types/passport-jwt`, etc.

4. **Peer Dependencies**: Check pnpm output for peer dependency warnings
   - Some packages may have additional requirements

---

## Troubleshooting

### Missing Type Definitions

If you see TypeScript errors about missing types:
```bash
pnpm add --save-dev @types/[package-name]
```

### Package Conflicts

If there are version conflicts:
```bash
pnpm install  # Reinstall all
pnpm dedupe   # Deduplicate dependencies
```

### Size Optimization

For production builds, remove dev dependencies:
```bash
pnpm prune --production
```

---

## References

- **Bootstrap Installation**: See Initial Setup section
- **Sprint 1**: See Security Hardening section
- **Sprint 2**: See Identity & Entitlements section
- **Sprint 3**: See Knowledge Platform section

---

**Last Updated**: [Current Date]
**Maintained By**: PBT Engineering Team
**Next Review**: After Sprint 3 completion
