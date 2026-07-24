# Sprint 1 — Foundation Hardening

**Status:** In Progress (Lead Engineer Review Phase Complete)

**Goal:** Bring the platform's infrastructure to production-grade operational standards.

## Overview

After the lead engineer's comprehensive review, we've identified critical areas for hardening:

1. **Infrastructure Security & Configuration** ✅ Implemented
2. **Security Hardening** ✅ Implemented
3. **Health Monitoring** ✅ Implemented
4. **Error Handling Standardization** ✅ Implemented
5. **Logging & Observability** ✅ Implemented
6. **Entitlements Foundation** ✅ Implemented

---

## Phase 1: Infrastructure & Environment Validation

### What Was Added

**File:** `src/config/envValidator.ts`

- Zod-based environment validation
- Schema-based configuration with strict type checking
- Startup configuration validation
- Production-specific requirements checking
- Clear error messages for missing variables

### Features

✅ Secure environment variable defaults (none are insecure)
✅ Schema-based validation (Zod)
✅ Pre-startup validation before server boots
✅ Production mode checks
✅ Optional service warnings (email, storage)

### Usage

```typescript
import { validateEnv, validateStartupConfig } from '@/config/envValidator';

// In server.ts
const config = validateEnv();
validateStartupConfig(config);
```

---

## Phase 2: Security Hardening

### What Was Added

**File:** `src/core/middleware/securityMiddleware.ts`

#### 1. Request Correlation IDs
- Unique ID per request for tracking
- Passed through response headers
- Used for distributed logging

#### 2. Request Duration Logging
- Tracks request processing time
- Logs user ID (when authenticated)
- Logs HTTP status codes

#### 3. Global Rate Limiting
- Configurable via environment
- Default: 100 requests per 15 minutes
- Skips health checks
- Uses user ID or IP for tracking

#### 4. Authentication Rate Limiting
- Specific endpoint: `/api/v1/auth/*`
- Default: 5 attempts per 5 minutes
- Rate limits by email + IP combination

#### 5. Data Sanitization
- NoSQL injection prevention
- Removes malicious operators
- Warns when detected

#### 6. Parameter Pollution Protection
- Detects duplicate query parameters
- Removes duplicate body fields
- Prevents exploitation

#### 7. Request Validation
- Ensures proper content-type headers
- POST/PUT/PATCH validation
- Rejects invalid media types

#### 8. Custom Security Headers
- X-Frame-Options: DENY (clickjacking protection)
- X-Content-Type-Options: nosniff (MIME sniffing)
- X-XSS-Protection: enabled
- Content-Security-Policy
- Referrer-Policy
- Permissions-Policy

### Environment Variables

```bash
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100       # per window

# Security
ENABLE_HELMET=true

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## Phase 3: Health Monitoring Endpoints

### What Was Added

**File:** `src/core/health/health.routes.ts`

#### 1. Basic Health Check: `/health`

**Purpose:** Liveness probe for load balancers

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "environment": "production",
  "version": "1.0.0",
  "checks": {
    "database": "ok",
    "memory": "45%",
    "cpu": "120ms"
  }
}
```

**Status Codes:**
- `200`: Healthy
- `503`: Degraded (database error)

#### 2. Readiness Check: `/ready`

**Purpose:** Deployment probe for Kubernetes/orchestrators

**Verifies:**
- MongoDB connection
- Cloudinary configuration
- SMTP configuration

**Response:**
```json
{
  "ready": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "database": { "status": "ok" },
    "storage": { "status": "ok" },
    "email": { "status": "ok" }
  }
}
```

**Status Codes:**
- `200`: Ready for traffic
- `503`: Not ready (dependencies missing)

#### 3. Diagnostics: `/health/details` (Dev only)

**Purpose:** Debug endpoint (development only)

**Info:**
- Node version
- Memory usage
- CPU usage
- Database details
- Configuration status

**Access:** Only in development mode

### Usage in Kubernetes/Docker

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 5000
  initialDelaySeconds: 10
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /ready
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## Phase 4: Standardized API Responses & Error Codes

### What Was Added

**File:** `src/shared/errorCodes.ts`

#### Error Code System

**Format:** `ERR_XXXX` (category + code)

**Categories:**
- `10XX` - General Errors
- `20XX` - Authentication Errors
- `30XX` - User Errors
- `40XX` - Membership Errors
- `50XX` - Learning Errors
- `60XX` - Event Errors
- `70XX` - Resource Errors
- `80XX` - Community Errors
- `90XX` - Networking Errors
- `100XX` - File Upload Errors
- `110XX` - Email Errors
- `120XX` - Configuration Errors

#### Each Error Includes

```typescript
{
  code: ErrorCode,           // ERR_2001
  httpStatus: 401,           // HTTP status
  message: string,           // Technical message
  description: string,       // Developer description
  userMessage: string,       // Frontend-friendly message
  retryable: boolean,        // Can user retry?
}
```

#### Usage in Code

```typescript
import { ErrorCode, getErrorInfo } from '@/shared/errorCodes';
import { AppError } from '@/core/errors/AppError';

// Throw standardized error
throw new AppError(
  ErrorCode.INVALID_CREDENTIALS,
  'Email or password is incorrect',
  401
);

// Get error info
const info = getErrorInfo(ErrorCode.RATE_LIMIT_EXCEEDED);
// {
//   httpStatus: 429,
//   message: 'Rate limit exceeded',
//   userMessage: 'Too many requests. Please try again later.'
// }
```

#### API Response Format

**Success:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "errorCode": null
}
```

**Error:**
```json
{
  "success": false,
  "message": "Email or password is incorrect",
  "data": null,
  "errorCode": "ERR_2002",
  "retryable": false
}
```

---

## Phase 5: Structured Logging & Observability

### Request Correlation IDs

Every request gets unique ID:
```
X-Correlation-ID: abc123-xyz789
```

All logs for that request include the correlation ID, enabling end-to-end tracing.

### Structured Logging

All logs in JSON format:
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "Request completed",
  "correlationId": "abc123-xyz789",
  "method": "POST",
  "path": "/api/v1/auth/login",
  "statusCode": 200,
  "duration": "45ms",
  "userId": "user-123",
  "ip": "192.168.1.1"
}
```

### Log Levels

- **ERROR**: Critical failures requiring attention
- **WARN**: Warnings and potential issues
- **INFO**: Important business events
- **DEBUG**: Detailed development information

### Cloud Deployment

Logs stream to `stdout` for easy integration with:
- Kubernetes logging
- Docker logging drivers
- Cloud provider logging (GCP Stackdriver, AWS CloudWatch, etc.)

---

## Phase 6: Entitlements & RBAC Foundation

### What Was Added

**Files:**
- `src/modules/entitlements/services/entitlements.service.ts`
- `src/core/middleware/entitlementsMiddleware.ts`

### Subscription Hierarchy

```
PBT Mentorship (premium)
  ↓ includes
PBT Plus (mid-tier)
  ↓ includes
PBT Pathway (entry-level)
  ↓ includes
Free (basic)
```

### Entitlements Define Access

**Instead of:**
```typescript
if (user.role === 'premium') {
  // allow access
}
```

**Do:**
```typescript
await EntitlementsService.requireAccess(
  subscription,
  'canAccessPremiumResources'
);
```

### Features Managed

- Learning access (levels, certificates)
- Event access (recordings, premium events)
- Mentorship sessions (booking, frequency)
- Resource downloads (limits, types)
- Community features (moderation, threads)
- API access (rate limits, integrations)
- Support tier (email, priority, dedicated)

### Usage in Routes

```typescript
import { requireEntitlement } from '@/core/middleware/entitlementsMiddleware';

router.get(
  '/premium-resources',
  requireEntitlement('canAccessPremiumResources'),
  controller.getPremiumResources
);
```

---

## Implementation Checklist

- ✅ Environment validation with Zod
- ✅ Security middleware (rate limiting, sanitization, headers)
- ✅ Health checks (`/health`, `/ready`)
- ✅ Error code registry (100+ standardized errors)
- ✅ Request correlation IDs
- ✅ Structured logging
- ✅ Entitlements service
- ✅ RBAC middleware

---

## Environment Configuration

Update `.env`:

```bash
# Application
NODE_ENV=production
PORT=5000
API_VERSION=v1
APP_NAME=PBT Backend API

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/pbt
MONGODB_DB_NAME=pbt

# JWT
JWT_SECRET=your-secret-min-32-chars-here
JWT_EXPIRY=15m
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_REFRESH_EXPIRY=7d

# CORS
CORS_ORIGIN=https://yourdomain.com

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ENABLE_HELMET=true

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
SMTP_FROM=noreply@pbt.com

# Storage
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
ENABLE_CONSOLE_LOGS=true
```

---

## Testing Sprint 1

### Test Health Endpoints

```bash
# Basic health
curl http://localhost:5000/health

# Readiness
curl http://localhost:5000/ready

# Diagnostics (dev only)
curl http://localhost:5000/health/details
```

### Test Rate Limiting

```bash
# Make multiple rapid requests
for i in {1..101}; do
  curl http://localhost:5000/api/v1/auth/me
done
# Should receive 429 after 100 requests
```

### Test Error Handling

```bash
# Invalid request
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"invalid":"data"}'

# Should return standardized error with errorCode
```

### Test Correlation IDs

```bash
curl -v http://localhost:5000/api/v1/auth/me \
  -H "X-Correlation-ID: my-trace-id"

# Response header should include:
# X-Correlation-ID: my-trace-id
# X-Response-Time: 2024-01-15T10:30:00Z
```

---

## Next Steps (Sprint 2)

After Sprint 1 is validated:

1. **Identity & Membership** - Separate roles from subscriptions
2. **Session Management** - Refresh token rotation
3. **Audit Logging** - Track all member actions
4. **Feature Flags** - Safe rollout of new features

---

## Production Checklist

Before deploying to production:

- [ ] All environment variables set
- [ ] SSL/TLS certificates configured
- [ ] Database backups enabled
- [ ] Monitoring alerts configured
- [ ] Load balancer configured with `/health` probe
- [ ] Log aggregation set up
- [ ] Error tracking (Sentry/similar) configured
- [ ] Secrets rotated and secure
- [ ] Rate limits tuned for expected traffic
- [ ] CORS origins whitelist set correctly

---

## References

- Lead Engineer Assessment: `ENGINEERING_CONSTITUTION.md`
- Error Codes: `src/shared/errorCodes.ts`
- Security: `src/core/middleware/securityMiddleware.ts`
- Health: `src/core/health/health.routes.ts`

---

Built following PBT Engineering Constitution - Foundation Hardening Initiative
