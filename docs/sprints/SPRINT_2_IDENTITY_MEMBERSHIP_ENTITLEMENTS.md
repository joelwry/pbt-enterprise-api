# Sprint 2 — Identity, Membership & Entitlements

**Goal:** Make the backend understand PBT's business model and build a future-proof identity layer.

## Packages Required for Sprint 2

**NEW packages to install (Run once):**
```bash
pnpm add jsonwebtoken-redis redis node-cache crypto-js
pnpm add -D @types/redis
```

**Already Installed (No need to install again):**
- jsonwebtoken (JWT handling)
- bcryptjs (Password hashing)
- mongoose (Database)
- zod (Validation)
- winston (Logging)

See `PACKAGE_MANAGEMENT.md` for tracking.

---

## Implementation Phases

### Phase 1: Subscription Model & Tier Hierarchy

**What we're building:**
```
PBT Pathway (Basic)
    ↓
PBT Plus (Professional)
    ↓
PBT Mentorship (Premium)
```

**Inheritance Model:**
- Mentorship includes all Plus features + Plus includes all Pathway features
- Users can only be in ONE tier at a time
- Subscriptions have start/end dates with auto-renewal

**Files to create:**
- `src/modules/subscriptions/schemas/Subscription.schema.ts`
- `src/modules/subscriptions/types/subscription.types.ts`
- `src/shared/subscription.constants.ts`

### Phase 2: Enhanced Entitlements Service

**Current state:** Basic feature checking
**Target state:** Sophisticated entitlement resolution with feature inheritance

**Key capabilities:**
```ts
// Single feature check
await EntitlementsService.canAccess(userId, 'access-mentors');

// Feature list by subscription
await EntitlementsService.getFeaturesByTier('mentorship');

// Upgrade path recommendations
await EntitlementsService.suggestUpgrades(userId);

// Feature comparison for pricing page
await EntitlementsService.compareFeatures('pathway', 'plus', 'mentorship');
```

### Phase 3: Session Management

**What we need:**
- Session table storing active sessions per user
- Device tracking (browser fingerprint, IP, user agent)
- Session invalidation on logout
- Session timeout handling
- Concurrent session limiting (if needed)

**Files to create:**
- `src/modules/sessions/schemas/Session.schema.ts`
- `src/modules/sessions/services/session.service.ts`
- `src/modules/sessions/controllers/session.controller.ts`

### Phase 4: Device Tracking

**User scenarios:**
- "Show me all my active devices"
- "Log out from all other devices"
- "Revoke access to this specific device"

**What we track:**
- Device fingerprint (browser + OS + device type)
- IP address
- User agent string
- Last activity time
- Device name (optional, user-provided)

**Files to create:**
- `src/modules/devices/schemas/Device.schema.ts`
- `src/modules/devices/services/device.service.ts`
- `src/modules/devices/controllers/device.controller.ts`

### Phase 5: Account Activity Logging

**Audit trail for compliance:**
```
LOGIN_SUCCESS
LOGIN_FAILED
PASSWORD_RESET
EMAIL_VERIFIED
SUBSCRIPTION_UPGRADED
SUBSCRIPTION_DOWNGRADED
SUBSCRIPTION_CANCELLED
PROFILE_UPDATED
LOGOUT
DEVICE_ADDED
DEVICE_REMOVED
...
```

**Files to create:**
- `src/modules/audit/schemas/AuditLog.schema.ts`
- `src/modules/audit/services/audit.service.ts`

### Phase 6: Refresh Token Rotation

**Current flow:**
```
login → Access Token + Refresh Token
refresh → New Access Token + Refresh Token
```

**Enhanced flow:**
```
login → Access Token + Refresh Token (stored in Redis)
refresh → 
  - Verify Refresh Token exists in Redis
  - Invalidate old Refresh Token
  - Issue new Refresh Token (new expiry)
  - Store in Redis
  - Return new Access Token + Refresh Token
logout → Delete Refresh Token from Redis
```

### Phase 7: Logout Everywhere

**Implementation:**
- User clicks "Logout Everywhere"
- All refresh tokens for that user are invalidated
- All sessions are closed
- User is logged out everywhere

### Phase 8: Session Expiration

**Token Expiry:**
- Access token: 15 minutes
- Refresh token: 7 days
- Session timeout: 30 minutes of inactivity

**Behavior:**
- User makes request within 15 min → Access token valid
- User makes request after 15 min but within 7 days → Use refresh token to get new access token
- User inactive for 30 min → Session expires (even if refresh token valid)
- User doesn't make request for 7 days → Refresh token expires

---

## API Endpoints to Create

### Authentication Enhancements
- `POST /api/v1/auth/refresh-token` - Get new access token (ALREADY EXISTS - enhance)
- `POST /api/v1/auth/logout-everywhere` - Invalidate all sessions
- `POST /api/v1/auth/logout` - Logout this device (ALREADY EXISTS - enhance)

### Sessions
- `GET /api/v1/sessions` - List all active sessions
- `DELETE /api/v1/sessions/:sessionId` - Logout from specific device

### Devices
- `GET /api/v1/devices` - List all trusted devices
- `DELETE /api/v1/devices/:deviceId` - Remove device
- `POST /api/v1/devices/:deviceId/trust` - Mark as trusted
- `POST /api/v1/devices/:deviceId/block` - Block device

### Audit
- `GET /api/v1/account/activity` - Get account activity log
- `GET /api/v1/account/security-events` - Get security events

### Subscriptions
- `GET /api/v1/subscriptions/current` - Get current subscription
- `GET /api/v1/subscriptions/plans` - Get all available plans
- `POST /api/v1/subscriptions/upgrade` - Upgrade subscription
- `POST /api/v1/subscriptions/downgrade` - Downgrade subscription
- `POST /api/v1/subscriptions/cancel` - Cancel subscription

### Entitlements
- `GET /api/v1/entitlements/features` - Get my available features
- `GET /api/v1/entitlements/compare` - Compare features between tiers
- `POST /api/v1/entitlements/check` - Check if user can access feature

---

## Database Schema Changes

### New Collections

**Subscriptions**
```json
{
  "_id": ObjectId,
  "userId": ObjectId (ref: users),
  "tier": "pathway|plus|mentorship",
  "status": "active|pending|cancelled|expired",
  "startDate": Date,
  "endDate": Date,
  "autoRenew": Boolean,
  "billingCycle": "monthly|annual",
  "amount": Number,
  "currency": "GBP|USD",
  "transactionId": String,
  "cancelledAt": Date (soft delete),
  "createdAt": Date,
  "updatedAt": Date
}
```

**Sessions**
```json
{
  "_id": ObjectId,
  "userId": ObjectId (ref: users),
  "deviceId": ObjectId (ref: devices),
  "refreshToken": String (hashed),
  "refreshTokenExpiresAt": Date,
  "ipAddress": String,
  "userAgent": String,
  "isActive": Boolean,
  "lastActivityAt": Date,
  "createdAt": Date,
  "expiresAt": Date
}
```

**Devices**
```json
{
  "_id": ObjectId,
  "userId": ObjectId (ref: users),
  "fingerprint": String,
  "ipAddress": String,
  "userAgent": String,
  "deviceType": "desktop|mobile|tablet",
  "browserName": String,
  "osName": String,
  "deviceName": String,
  "isTrusted": Boolean,
  "isBlocked": Boolean,
  "lastUsedAt": Date,
  "createdAt": Date
}
```

**AuditLogs**
```json
{
  "_id": ObjectId,
  "userId": ObjectId (ref: users),
  "action": String,
  "resource": String,
  "details": Object,
  "ipAddress": String,
  "userAgent": String,
  "status": "success|failure",
  "timestamp": Date
}
```

---

## Testing Checklist

- [ ] Create subscription for user
- [ ] Verify tier hierarchy (plus user can access pathway features)
- [ ] Test feature access based on subscription
- [ ] Login and verify session created
- [ ] Verify refresh token in Redis
- [ ] Refresh access token using refresh token
- [ ] Logout and verify refresh token deleted
- [ ] Create new session on different device
- [ ] Logout from all devices
- [ ] Verify all refresh tokens deleted
- [ ] Check audit log for all actions
- [ ] Verify session timeout after 30 min inactivity
- [ ] Verify refresh token expires after 7 days

---

## Security Considerations

1. **Refresh tokens stored in Redis (not MongoDB)** - Faster, can expire automatically
2. **Refresh tokens hashed before storage** - Never store plain tokens
3. **Device fingerprinting** - Detect if someone uses same device with different IP
4. **Rate limiting on refresh endpoint** - Prevent token refresh attacks
5. **Audit logging of sensitive actions** - Security events, password resets, etc.
6. **Session invalidation on subscription downgrade** - Premium features removed
7. **Logout everywhere invalidates all refresh tokens** - Full account lock down option

---

## Integration Points

### With Sprint 1
- Uses security middleware (rate limiting)
- Uses structured logging
- Uses error codes
- Uses request correlation IDs

### With Frontend
- Store refresh token in httpOnly cookie (preferred) or secure storage
- Handle 401 responses by triggering refresh token flow
- Handle 403 responses for entitlement checks
- Show subscription tier on profile

### With Billing System
- Call subscription service before granting access
- Update subscription status on payment
- Downgrade on payment failure (after grace period)

---

## Success Metrics

After Sprint 2 completion, you should have:

- Complete subscription model with tier hierarchy
- Sophisticated entitlements service answering business questions
- Session management tracking every active user
- Device tracking for security
- Account activity audit trail
- Refresh token rotation preventing hijacking
- Logout everywhere capability
- Session expiration after inactivity
- Zero subscription logic in controllers
