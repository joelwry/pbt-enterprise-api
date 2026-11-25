# PBT Backend API

Property Business Training - Enterprise-Grade Backend API built with Express.js, TypeScript, and MongoDB.

## 🏗️ Architecture

This project follows **Feature-Based Clean Architecture** with clear separation of concerns:

```
src/
├── config/           # Environment configuration
├── core/             # Core utilities
│   ├── auth/         # JWT helpers
│   ├── errors/       # Custom error classes
│   ├── logger/       # Winston logger
│   ├── middleware/   # Reusable middleware
│   ├── pagination/   # Pagination utilities
│   └── response/     # Response handler
├── database/         # MongoDB connection
├── modules/          # Feature modules
│   ├── auth/         # Authentication
│   ├── users/        # User management
│   ├── memberships/  # Membership management
│   ├── learning/     # Learning programs
│   ├── events/       # Event management
│   ├── resources/    # Resource library
│   ├── community/    # Community discussions
│   ├── leaders/      # PBT leaders
│   └── power-team/   # Power team professionals
├── shared/           # Shared utilities
├── app.ts            # Express app setup
└── server.ts         # Server entry point
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 5+
- pnpm (or npm/yarn)

### Installation

```bash
# Install dependencies
pnpm install

# Create .env file
cp .env.example .env

# Edit .env with your values
```

### Running Locally

```bash
# Development (with hot reload)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Type checking
pnpm type-check

# Linting
pnpm lint
```

Server will run on `http://localhost:5000`

## 📚 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/verify-email` - Verify email
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password
- `GET /api/v1/auth/me` - Get current user (protected)
- `POST /api/v1/auth/logout` - Logout (protected)

### Learning
- `GET /api/v1/learning/years` - Get available program years (protected)
- `GET /api/v1/learning/programmes/:year` - Get program overview (protected)
- `GET /api/v1/learning/modules/:moduleId` - Get module lessons (protected)
- `GET /api/v1/learning/lessons/:lessonId` - Get lesson details (protected)
- `POST /api/v1/learning/lessons/:lessonId/progress` - Update lesson progress (protected)
- `GET /api/v1/learning/continue` - Get continue where left off (protected)

### Memberships
- `GET /api/v1/memberships/current` - Get current membership (protected)
- `POST /api/v1/memberships/upgrade` - Upgrade membership tier (protected)
- `POST /api/v1/memberships/cancel` - Cancel membership (protected)
- `POST /api/v1/memberships/add-year` - Add accessible year (protected)

### Events
- `GET /api/v1/events/upcoming` - Get upcoming events
- `GET /api/v1/events/past` - Get past events
- `GET /api/v1/events/:eventId` - Get event details
- `POST /api/v1/events/:eventId/rsvp` - RSVP to event (protected)
- `DELETE /api/v1/events/:eventId/rsvp` - Cancel RSVP (protected)

### Resources
- `GET /api/v1/resources` - Get resources with pagination
- `GET /api/v1/resources/:resourceId` - Get resource details
- `GET /api/v1/resources/categories/list` - Get categories
- `GET /api/v1/resources/types/list` - Get types
- `GET /api/v1/resources/popular/top` - Get popular resources

### Leaders
- `GET /api/v1/leaders` - Get leaders
- `GET /api/v1/leaders/:leaderId` - Get leader details
- `GET /api/v1/leaders/region/:region` - Get leaders by region
- `GET /api/v1/leaders/regions/list` - Get available regions
- `GET /api/v1/leaders/top/rated` - Get top leaders

### Power Team
- `GET /api/v1/power-team` - Get power team members
- `GET /api/v1/power-team/:memberId` - Get member details
- `GET /api/v1/power-team/category/:category` - Get members by category
- `GET /api/v1/power-team/categories/list` - Get categories
- `GET /api/v1/power-team/regions/list` - Get regions
- `GET /api/v1/power-team/verified/list` - Get verified members

## 🔐 Security Features

- ✅ JWT authentication with access & refresh tokens
- ✅ Password hashing with bcrypt
- ✅ Role-Based Access Control (RBAC)
- ✅ Helmet for HTTP headers security
- ✅ CORS protection
- ✅ Request validation with Zod
- ✅ Soft deletes for data integrity
- ✅ Comprehensive logging
- ✅ Error handling & monitoring

## 🗄️ Database Schema

### Collections

1. **users** - User accounts with authentication
2. **memberships** - User membership tiers
3. **modules** - Learning program modules
4. **lessons** - Individual lessons with scheduling
5. **user_lesson_progress** - User learning progress
6. **events** - Training events
7. **resources** - Learning resources (templates, guides, etc.)
8. **community_threads** - Community discussions
9. **leaders** - PBT local leaders
10. **power_team_members** - Trusted professionals

## 📋 Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 100,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Field error 1", "Field error 2"]
}
```

## 🛠️ Technologies

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with refresh tokens
- **Validation**: Zod
- **Logging**: Winston
- **Security**: Helmet, CORS, bcryptjs
- **File Upload**: Cloudinary
- **Documentation**: Swagger/OpenAPI

## 📖 Development Guidelines

### Code Structure

Each module follows this pattern:

```
module/
├── schemas/      # Mongoose schemas
├── repositories/ # Data access layer
├── services/     # Business logic layer
├── controllers/  # Request handlers
├── validators/   # Input validation schemas
├── routes/       # Route definitions
└── types.ts      # TypeScript interfaces
```

### Best Practices

1. **Never duplicate logic** - Use services for business logic
2. **Never use HTTP in repositories** - Only database operations
3. **Always validate input** - Use Zod schemas in middleware
4. **Soft delete everything** - Use deletedAt field for data recovery
5. **Log important actions** - Use Winston logger for auditing
6. **Paginate collections** - Use PaginationHelper for list endpoints
7. **Handle errors gracefully** - Use custom error classes
8. **Type everything** - Strict TypeScript usage required

## 🚦 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Critical variables (must be changed for production)
JWT_SECRET=
JWT_REFRESH_SECRET=
MONGODB_URI=

# Email (for password reset, verification)
SMTP_HOST=
SMTP_USER=
SMTP_PASS=

# File uploads
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# CORS
CORS_ORIGIN=http://localhost:3000
```

## 🧪 Testing

```bash
# Unit tests (not yet implemented)
pnpm test

# Integration tests
pnpm test:integration

# Test coverage
pnpm test:coverage
```

## 📝 Logging

The application uses Winston for structured logging:

- **Console**: Colored output for development
- **error.log**: Error logs only
- **app.log**: All application logs

Access logs in the `logs/` directory.

## 🔄 Refresh Token Rotation

The API implements refresh token rotation for enhanced security:

1. Access token expires in 15 minutes
2. Refresh token expires in 7 days
3. Each refresh generates new tokens
4. Old tokens are invalidated

## 🤝 Contributing

1. Follow the code structure
2. Use TypeScript strict mode
3. Add proper error handling
4. Write descriptive logs
5. Test before committing
6. Update documentation

## 📄 License
Proprietary - Property Business Training UK

## 🆘 Support

For issues and questions, contact the development team.

---

Built with ❤️ for Property Business Training UK
