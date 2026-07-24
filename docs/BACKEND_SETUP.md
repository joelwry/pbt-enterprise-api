# PBT Backend API - Setup & Deployment Guide

## Overview

The PBT Backend API is an enterprise-grade Express.js application built with TypeScript, MongoDB, and follows clean architecture principles. This guide covers setup, development, and deployment.

## Project Structure

```
src/
├── config/              # Environment & configuration
├── core/                # Core infrastructure
│   ├── auth/           # JWT authentication
│   ├── database/       # Database utilities
│   ├── email/          # Email service
│   ├── errors/         # Custom error handling
│   ├── file/           # File upload utilities
│   ├── logger/         # Winston logger
│   ├── middleware/     # Express middleware
│   ├── pagination/     # Pagination utilities
│   ├── response/       # Response formatting
│   └── validation/     # Input validation
├── database/            # MongoDB connection
├── modules/             # Feature modules
│   ├── auth/           # Authentication (JWT)
│   ├── users/          # User management
│   ├── memberships/    # Membership tiers
│   ├── learning/       # Learning programs
│   ├── events/         # Event management
│   ├── resources/      # Resource library
│   ├── community/      # Community forums
│   ├── leaders/        # Local leaders
│   └── power-team/     # Professional network
├── shared/              # Shared utilities
│   ├── constants.ts    # Global constants
│   └── types.ts        # TypeScript types
├── app.ts              # Express app setup
└── server.ts           # Server entry point
```

## Prerequisites

- **Node.js**: 18.x or higher
- **MongoDB**: 5.0 or higher
- **pnpm**: 8.0 or higher (npm/yarn also supported)

## Installation

### 1. Clone & Install Dependencies

```bash
# Install dependencies
pnpm install

# Or using npm
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env
```

**Required Environment Variables:**

```env
# Server Configuration
NODE_ENV=development
PORT=5000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://localhost:27017/pbt

# JWT Tokens (generate with: openssl rand -base64 32)
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email Configuration (optional, for production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# CORS
CORS_ORIGIN=http://localhost:3000

# File Uploads
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000
```

## Development

### Start Development Server

```bash
# With hot reload using nodemon
pnpm dev

# Server will start on http://localhost:5000
```

### Build for Production

```bash
# Compile TypeScript to JavaScript
pnpm build

# Output goes to ./dist directory
```

### Type Checking

```bash
# Check TypeScript without emitting
pnpm type-check
```

### Linting

```bash
# Run ESLint
pnpm lint
```

## API Documentation

Complete API documentation is available in `API_DOCUMENTATION.md`.

**Key Endpoints:**

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/learning/years` - Get accessible learning years
- `GET /api/v1/events/upcoming` - Get upcoming events
- `GET /api/v1/community` - Get community threads
- `GET /api/v1/leaders` - Get PBT leaders

## Database Setup

### MongoDB Local Setup

```bash
# Install MongoDB Community Edition
# macOS: brew install mongodb-community
# Ubuntu: Follow official MongoDB docs

# Start MongoDB
mongod

# Connection string for .env:
# MONGODB_URI=mongodb://localhost:27017/pbt
```

### MongoDB Atlas (Cloud)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster and database
3. Get connection string
4. Update `.env` with your connection string:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/pbt?retryWrites=true&w=majority
```

## Module Architecture

Each module follows this structure:

```
module/
├── schemas/      # Mongoose schemas & models
├── repositories/ # Data access layer
├── services/     # Business logic layer
├── controllers/  # Request handlers
├── validators/   # Zod validation schemas
├── routes/       # Express routes
└── types.ts      # Module-specific types
```

### Example: Adding a New Feature

1. **Create Schema** (`schemas/Feature.schema.ts`)
```typescript
import { Schema, model } from 'mongoose';

const featureSchema = new Schema({
  name: String,
  // ...
});

export const Feature = model('Feature', featureSchema);
```

2. **Create Repository** (`repositories/feature.repository.ts`)
```typescript
export class FeatureRepository {
  static async findAll() {
    return Feature.find({ deletedAt: null });
  }
}
```

3. **Create Service** (`services/feature.service.ts`)
```typescript
export class FeatureService {
  static async getAllFeatures() {
    return FeatureRepository.findAll();
  }
}
```

4. **Create Controller** (`controllers/feature.controller.ts`)
```typescript
export class FeatureController {
  static getAll = asyncHandler(async (req, res) => {
    const features = await FeatureService.getAllFeatures();
    return ResponseHandler.success(res, features);
  });
}
```

5. **Create Routes** (`routes/feature.routes.ts`)
```typescript
import { Router } from 'express';
import { FeatureController } from '../controllers/feature.controller';

const router = Router();
router.get('/', FeatureController.getAll);
export default router;
```

6. **Register in App** (`app.ts`)
```typescript
import featureRoutes from '@/modules/feature/routes/feature.routes';
app.use(`/api/${config.API_VERSION}/features`, featureRoutes);
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication:

- **Access Token**: Expires in 15 minutes
- **Refresh Token**: Expires in 7 days
- **Refresh Token Rotation**: New tokens on every refresh

### Using Authentication

Include token in header:
```
Authorization: Bearer {accessToken}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Specific error details"],
  "code": "ERROR_CODE"
}
```

Errors are handled by `errorHandler` middleware and logged via Winston.

## Logging

Winston logger configured with:
- **Console**: Colored output for development
- **File**: `logs/app.log` for all logs
- **File**: `logs/error.log` for errors only

Access logs in development:
```bash
tail -f logs/app.log
```

## Validation

Request validation uses Zod schemas. Example:

```typescript
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string(),
});

export const validateBody = (schema) => {
  return (req, res, next) => {
    const validated = schema.parse(req.body);
    req.body = validated;
    next();
  };
};
```

## Testing

Tests can be added in `src/**/*.test.ts`:

```bash
# Run tests (once configured)
pnpm test
```

## Deployment

### Deploy to Vercel

1. Connect GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy:
```bash
vercel
```

### Deploy to Heroku

```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your_mongodb_uri
# ... add other env vars

# Deploy
git push heroku main
```

### Deploy to AWS/DigitalOcean

1. Build the project: `pnpm build`
2. Upload `dist/` folder to your server
3. Install dependencies: `npm install --production`
4. Start server: `npm start`
5. Use PM2 to manage process:
```bash
npm install -g pm2
pm2 start dist/server.js --name "pbt-api"
pm2 save
```

## Performance & Monitoring

### Database Indexes

Indexes are created automatically in schemas. Current indexes:
- `User`: email, role
- `Resource`: category, type, isActive
- `Event`: startDate, status
- `CommunityThread`: category, createdAt

Add more as needed in schemas.

### Caching Strategy

Implement Redis for:
- Session storage
- Rate limiting
- API response caching

### Load Testing

```bash
# Using autocannon
npm install -g autocannon
autocannon http://localhost:5000
```

## Troubleshooting

### MongoDB Connection Errors

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

Solution: Ensure MongoDB is running
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::5000
```

Solution: Change PORT in .env or kill process:
```bash
lsof -i :5000
kill -9 <PID>
```

### JWT Token Invalid

Ensure `JWT_SECRET` is set correctly in .env and matches across deployments.

### CORS Errors

Update `CORS_ORIGIN` in .env to match your frontend URL:
```env
CORS_ORIGIN=https://yourdomain.com
```

## Security Checklist

- [ ] Change default passwords
- [ ] Enable HTTPS in production
- [ ] Set strong JWT secrets (use `openssl rand -base64 32`)
- [ ] Enable rate limiting
- [ ] Use helmet middleware (already enabled)
- [ ] Implement CORS properly
- [ ] Validate all inputs with Zod
- [ ] Use environment variables for secrets
- [ ] Enable MongoDB authentication
- [ ] Regular security updates
- [ ] Monitor error logs for issues

## Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [JWT Introduction](https://jwt.io/introduction)

## Support & Contributions

For issues or questions:
1. Check existing documentation
2. Review error logs
3. Check MongoDB indexes
4. Test with API client (Postman, Insomnia)

## License

Proprietary - Property Business Training UK
