# PBT Backend API - Quick Start Guide

## What's New

This project now includes a **production-grade Express.js backend API** built alongside the existing React frontend. Both are in the same repository but function independently.

### Project Structure:
- **Frontend**: `app/`, `components/`, `features/`, `hooks/`, `providers/`, etc. (React/Next.js)
- **Backend**: `src/` folder (Express.js/Node.js)

---

## 5-Minute Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Setup Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env (at minimum, you need MONGODB_URI)
# For local development:
# MONGODB_URI=mongodb://localhost:27017/pbt
```

### 3. Start MongoDB (if running locally)
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Linux
sudo systemctl start mongod

# Windows - use MongoDB installer from mongodb.com
```

### 4. Run Backend Development Server
```bash
# In a separate terminal from frontend
pnpm dev

# Backend runs on http://localhost:5000
# Frontend runs on http://localhost:3000 (if you run next dev)
```

### 5. Test the API
```bash
# Get health check
curl http://localhost:5000/health

# Register a user
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'
```

---

## File Locations

### Backend Code
```
src/
├── config/           # Configuration management
├── core/             # Core infrastructure (logging, auth, errors, etc.)
├── database/         # MongoDB connection
├── modules/          # Feature modules (auth, learning, events, etc.)
├── shared/           # Shared types and constants
├── app.ts            # Express app setup
└── server.ts         # Server startup
```

### Backend Documentation
- `README.md` - Complete API documentation
- `API_DOCUMENTATION.md` - Detailed endpoint documentation
- `BACKEND_SETUP.md` - Setup and deployment guide
- `PROJECT_STRUCTURE.md` - File-by-file explanation
- `.env.example` - Environment variables template

---

## Key Backend Endpoints

### Authentication
```bash
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh-token
POST /api/v1/auth/verify-email
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/me              # Requires token
POST /api/v1/auth/logout          # Requires token
```

### Learning
```bash
GET /api/v1/learning/years
GET /api/v1/learning/programmes/:year
GET /api/v1/learning/modules/:moduleId
GET /api/v1/learning/lessons/:lessonId
POST /api/v1/learning/lessons/:lessonId/progress
GET /api/v1/learning/continue
```

### Events
```bash
GET /api/v1/events/upcoming
GET /api/v1/events/past
GET /api/v1/events/:eventId
POST /api/v1/events/:eventId/rsvp
DELETE /api/v1/events/:eventId/rsvp
```

### Community
```bash
GET /api/v1/community
GET /api/v1/community/categories
GET /api/v1/community/:threadId
POST /api/v1/community
POST /api/v1/community/:threadId/replies
POST /api/v1/community/:threadId/like
```

### Other
```bash
GET /api/v1/resources
GET /api/v1/leaders
GET /api/v1/power-team
GET /api/v1/memberships/current
POST /api/v1/memberships/upgrade
```

---

## Testing with Postman/Insomnia

### 1. Register
```
POST http://localhost:5000/api/v1/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "test@example.com",
  "password": "SecurePass123!",
  "phone": "+441234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { "id": "...", "email": "test@example.com" },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900
    }
  }
}
```

### 2. Login
```
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "SecurePass123!"
}
```

### 3. Use Token for Protected Routes
```
GET http://localhost:5000/api/v1/auth/me
Authorization: Bearer {accessToken}
```

---

## Connecting Frontend to Backend

The React frontend was built with mock data (in `features/*/mocks/`). To connect it to the real backend:

### 1. Update API Base URL
Edit `src/config/api.ts` (or create it):
```typescript
export const API_BASE_URL = 'http://localhost:5000/api/v1';
```

### 2. Replace Mock Calls with API Calls
Example - Update `features/auth/services/auth.service.ts`:

**Before (using mock):**
```typescript
export const authService = {
  login: (credentials) => Promise.resolve(AUTH_MOCK.login),
};
```

**After (using API):**
```typescript
import axios from 'axios';

export const authService = {
  login: async (credentials) => {
    const response = await axios.post(
      `${API_BASE_URL}/auth/login`,
      credentials
    );
    return response.data.data;
  },
};
```

### 3. Store Tokens
Use a library like `zustand` or `react-query` to manage authentication state:
```typescript
// Store tokens in localStorage/sessionStorage
localStorage.setItem('accessToken', response.tokens.accessToken);
localStorage.setItem('refreshToken', response.tokens.refreshToken);

// Add to API requests
axios.defaults.headers.common['Authorization'] = 
  `Bearer ${localStorage.getItem('accessToken')}`;
```

---

## Common Development Tasks

### Add New Endpoint

1. **Create Schema** (`src/modules/feature/schemas/Feature.schema.ts`)
2. **Create Repository** (`src/modules/feature/repositories/feature.repository.ts`)
3. **Create Service** (`src/modules/feature/services/feature.service.ts`)
4. **Create Controller** (`src/modules/feature/controllers/feature.controller.ts`)
5. **Create Routes** (`src/modules/feature/routes/feature.routes.ts`)
6. **Register Routes** in `src/app.ts`

### Add Database Field

1. Update schema in `src/modules/feature/schemas/Feature.schema.ts`
2. Run backend: `pnpm dev`
3. MongoDB will create new field on next save

### Handle Errors

All errors automatically:
- Logged to `logs/app.log` and `logs/error.log`
- Returned in consistent format
- Caught by global error handler

### Debug Issues

1. Check logs: `tail -f logs/app.log`
2. Use TypeScript: `pnpm type-check`
3. Add console logs with `[v0]` prefix:
   ```typescript
   console.log("[v0] Debug message:", variable);
   ```

---

## Environment Variables Explained

```env
# Server
NODE_ENV=development              # development or production
PORT=5000                         # Server port
API_VERSION=v1                    # API version prefix

# Database
MONGODB_URI=mongodb://...         # MongoDB connection string

# JWT (generate with: openssl rand -base64 32)
JWT_SECRET=...                    # Access token secret
JWT_REFRESH_SECRET=...            # Refresh token secret
JWT_EXPIRY=15m                    # Access token lifetime
JWT_REFRESH_EXPIRY=7d             # Refresh token lifetime

# CORS
CORS_ORIGIN=http://localhost:3000 # Frontend URL (for local dev)

# Email (optional, for production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Uploads (optional)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend (for email links)
FRONTEND_URL=http://localhost:3000
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All env vars set on hosting platform
- [ ] MongoDB Atlas database created
- [ ] JWT secrets generated securely
- [ ] CORS_ORIGIN updated to production domain
- [ ] Email service configured
- [ ] API endpoints tested
- [ ] Error logging working
- [ ] Database backups enabled
- [ ] Rate limiting considered
- [ ] HTTPS enabled

---

## Next Steps

1. **Read full documentation**: `README.md` or `API_DOCUMENTATION.md`
2. **Explore code**: Check `src/modules/auth/` for a complete example
3. **Add middleware**: Implement rate limiting, caching, etc.
4. **Connect frontend**: Replace mock data with real API calls
5. **Deploy**: Follow `BACKEND_SETUP.md` deployment guide

---

## Useful Commands

```bash
# Development
pnpm dev              # Start with hot reload

# Build
pnpm build            # Compile TypeScript
pnpm type-check       # Check types without emitting

# Production
npm start             # Run compiled code
pnpm build && npm start

# Maintenance
pnpm lint             # Check code quality
pnpm type-check       # Verify TypeScript

# Clean
rm -rf dist logs node_modules
pnpm install
```

---

## Getting Help

1. Check `API_DOCUMENTATION.md` for endpoint details
2. Check `BACKEND_SETUP.md` for setup issues
3. Check `PROJECT_STRUCTURE.md` for file explanations
4. Check logs in `logs/` directory
5. Search MongoDB documentation for query issues
6. Check Express.js documentation for middleware

---

**Happy coding! 🚀**

Need more help? See complete documentation in:
- `README.md` - Overview & tech stack
- `API_DOCUMENTATION.md` - All endpoints with examples
- `BACKEND_SETUP.md` - Deployment & troubleshooting
- `PROJECT_STRUCTURE.md` - File-by-file guide
