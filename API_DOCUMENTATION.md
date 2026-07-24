# PBT Backend API - Complete Documentation

## Table of Contents

1. [Authentication](#authentication)
2. [Learning Module](#learning-module)
3. [Memberships](#memberships)
4. [Events](#events)
5. [Resources](#resources)
6. [Community](#community)
7. [Leaders](#leaders)
8. [Power Team](#power-team)
9. [Error Handling](#error-handling)
10. [Response Formats](#response-formats)

---

## Authentication

### Register New User

**Endpoint:** `POST /api/v1/auth/register`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "phone": "+441234567890",
  "investmentFocus": "Residential Buy-to-Let"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {
      "id": "65c123abc456def789gh",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "membershipTier": "free",
      "role": "user"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900
    }
  }
}
```

### Login

**Endpoint:** `POST /api/v1/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "65c123abc456def789gh",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "membershipTier": "plus",
      "role": "user"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900
    }
  }
}
```

### Refresh Token

**Endpoint:** `POST /api/v1/auth/refresh-token`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

### Verify Email

**Endpoint:** `POST /api/v1/auth/verify-email`

**Request Body:**
```json
{
  "token": "verification_token_here"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### Forgot Password

**Endpoint:** `POST /api/v1/auth/forgot-password`

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset link sent to your email"
}
```

### Reset Password

**Endpoint:** `POST /api/v1/auth/reset-password`

**Request Body:**
```json
{
  "token": "reset_token_here",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

### Get Current User

**Endpoint:** `GET /api/v1/auth/me`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User profile retrieved",
  "data": {
    "id": "65c123abc456def789gh",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+441234567890",
    "avatar": "https://...",
    "location": "London",
    "investmentFocus": "Residential Buy-to-Let",
    "membershipTier": "plus",
    "role": "user",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:45:00Z"
  }
}
```

### Logout

**Endpoint:** `POST /api/v1/auth/logout`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

## Learning Module

### Get Available Years

**Endpoint:** `GET /api/v1/learning/years`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessibleYears": [1, 2, 3],
    "latestYear": 3
  }
}
```

### Get Program Overview

**Endpoint:** `GET /api/v1/learning/programmes/:year`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Parameters:**
- `year` (path): Year number (1-4)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "year": 1,
    "title": "Year 1 - Foundations",
    "modules": [
      {
        "id": "module_1",
        "title": "Property Market Fundamentals",
        "description": "Learn the basics of the property market",
        "lessonCount": 12,
        "progress": 50
      }
    ]
  }
}
```

### Get Module Lessons

**Endpoint:** `GET /api/v1/learning/modules/:moduleId`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Parameters:**
- `moduleId` (path): Module ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "module_1",
    "title": "Property Market Fundamentals",
    "lessons": [
      {
        "id": "lesson_1",
        "title": "Understanding the Market",
        "duration": 30,
        "progress": {
          "status": "completed",
          "percentage": 100
        }
      }
    ]
  }
}
```

### Get Lesson Details

**Endpoint:** `GET /api/v1/learning/lessons/:lessonId`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Parameters:**
- `lessonId` (path): Lesson ID

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "lesson_1",
    "title": "Understanding the Market",
    "description": "A comprehensive guide to understanding property markets",
    "duration": 30,
    "videoUrl": "https://...",
    "content": "<p>Lesson content...</p>",
    "resources": [
      {
        "id": "resource_1",
        "title": "Market Analysis Template",
        "type": "template",
        "url": "https://..."
      }
    ]
  }
}
```

### Update Lesson Progress

**Endpoint:** `POST /api/v1/learning/lessons/:lessonId/progress`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "status": "completed",
  "progress": 100
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Progress updated successfully"
}
```

### Get Continue Where Left Off

**Endpoint:** `GET /api/v1/learning/continue`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "lessonId": "lesson_42",
    "lessonTitle": "Advanced Investment Strategies",
    "moduleId": "module_5",
    "moduleName": "Year 2 - Intermediate Strategies",
    "progress": 65,
    "lastAccessedAt": "2024-01-20T14:30:00Z"
  }
}
```

---

## Memberships

### Get Current Membership

**Endpoint:** `GET /api/v1/memberships/current`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "membership_1",
    "tier": "plus",
    "status": "active",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z",
    "accessibleYears": [1, 2, 3],
    "autoRenew": true,
    "billingCycle": "annual",
    "amount": 4999,
    "features": [
      "All training modules and years",
      "Advanced resources",
      "Event access",
      "Email support"
    ]
  }
}
```

### Upgrade Membership

**Endpoint:** `POST /api/v1/memberships/upgrade`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "newTier": "mentorship",
  "billingCycle": "annual"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Membership upgraded successfully",
  "data": {
    "id": "membership_1",
    "tier": "mentorship",
    "amount": 9999,
    "assignedMentor": {
      "id": "leader_1",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com"
    }
  }
}
```

### Cancel Membership

**Endpoint:** `POST /api/v1/memberships/cancel`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "reason": "No longer interested"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Membership cancelled successfully",
  "data": {
    "cancelledAt": "2024-01-20T15:00:00Z",
    "activeUntil": "2024-12-31T23:59:59Z"
  }
}
```

### Add Accessible Year

**Endpoint:** `POST /api/v1/memberships/add-year`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "year": 4
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Year 4 added to your membership"
}
```

---

## Events

### Get Upcoming Events

**Endpoint:** `GET /api/v1/events/upcoming`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by event type
- `region` (optional): Filter by region

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "event_1",
      "title": "London Property Investment Masterclass",
      "description": "Learn advanced strategies for property investment",
      "type": "masterclass",
      "startDate": "2024-02-15T18:00:00Z",
      "endDate": "2024-02-15T20:00:00Z",
      "location": "London, UK",
      "virtualLink": "https://zoom.us/...",
      "capacity": 100,
      "rsvpCount": 45,
      "presenter": {
        "id": "leader_1",
        "name": "John Smith",
        "title": "Property Expert",
        "avatar": "https://..."
      },
      "image": "https://..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Get Event Details

**Endpoint:** `GET /api/v1/events/:eventId`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "event_1",
    "title": "London Property Investment Masterclass",
    "description": "Learn advanced strategies for property investment",
    "type": "masterclass",
    "status": "published",
    "startDate": "2024-02-15T18:00:00Z",
    "endDate": "2024-02-15T20:00:00Z",
    "location": "London, UK",
    "virtualLink": "https://zoom.us/...",
    "capacity": 100,
    "rsvpCount": 45,
    "userRsvp": {
      "status": "confirmed",
      "attendeeCount": 2,
      "dietaryRequirements": "Vegetarian"
    },
    "agenda": [
      "Welcome and Introduction",
      "Market Analysis Deep Dive",
      "Investment Strategies",
      "Q&A Session"
    ],
    "presenter": {
      "id": "leader_1",
      "name": "John Smith",
      "title": "Property Expert",
      "bio": "20+ years in property investment",
      "avatar": "https://..."
    }
  }
}
```

### RSVP to Event

**Endpoint:** `POST /api/v1/events/:eventId/rsvp`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "attendeeCount": 2,
  "dietaryRequirements": "Vegetarian",
  "accessibilityNeeds": "Wheelchair accessible seating"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "RSVP confirmed"
}
```

### Cancel RSVP

**Endpoint:** `DELETE /api/v1/events/:eventId/rsvp`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "RSVP cancelled"
}
```

---

## Resources

### Get Resources (Paginated)

**Endpoint:** `GET /api/v1/resources`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by type
- `category` (optional): Filter by category
- `search` (optional): Search by title or description

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "resource_1",
      "title": "Property Investment Analysis Template",
      "description": "A comprehensive template for analyzing property investments",
      "type": "template",
      "category": "property_finding",
      "url": "https://...",
      "fileSize": 1024000,
      "downloadCount": 234,
      "rating": 4.8,
      "createdAt": "2024-01-10T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 156,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Get Categories

**Endpoint:** `GET /api/v1/resources/categories/list`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "id": "property_finding", "label": "Property Finding" },
    { "id": "finance", "label": "Finance & Mortgages" },
    { "id": "legal", "label": "Legal & Compliance" },
    { "id": "marketing", "label": "Marketing & Branding" },
    { "id": "negotiation", "label": "Negotiation Skills" },
    { "id": "management", "label": "Property Management" }
  ]
}
```

### Get Popular Resources

**Endpoint:** `GET /api/v1/resources/popular/top`

**Query Parameters:**
- `limit` (optional): Number of resources (default: 10)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "resource_1",
      "title": "Property Investment Analysis Template",
      "type": "template",
      "rating": 4.8,
      "downloadCount": 450
    }
  ]
}
```

---

## Community

### Get Threads

**Endpoint:** `GET /api/v1/community`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `category` (optional): Filter by category
- `search` (optional): Search threads

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "thread_1",
      "title": "Best UK property markets in 2024?",
      "description": "Looking for recommendations on where to invest this year",
      "category": "investing",
      "createdBy": {
        "id": "user_1",
        "firstName": "John",
        "lastName": "Doe",
        "avatar": "https://..."
      },
      "viewCount": 234,
      "replyCount": 12,
      "likes": 45,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 567,
    "totalPages": 29,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

### Get Categories

**Endpoint:** `GET /api/v1/community/categories`

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    { "id": "general", "label": "General Discussion" },
    { "id": "strategies", "label": "Strategies & Tips" },
    { "id": "deals", "label": "Deal Analysis" },
    { "id": "investing", "label": "Investing Questions" },
    { "id": "mindset", "label": "Mindset & Motivation" },
    { "id": "off-topic", "label": "Off Topic" }
  ]
}
```

---

## Leaders

### Get Leaders

**Endpoint:** `GET /api/v1/leaders`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `region` (optional): Filter by region

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "leader_1",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phone": "+441234567890",
      "avatar": "https://...",
      "bio": "Expert in residential property investment",
      "region": "London",
      "specialties": ["Buy-to-Let", "Value-Add"],
      "rating": 4.9,
      "reviewCount": 127,
      "verified": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## Error Handling

All errors follow a consistent format:

**Error Response (400, 401, 404, 500, etc.):**
```json
{
  "success": false,
  "message": "Error message",
  "errors": ["Specific error 1", "Specific error 2"],
  "code": "ERROR_CODE"
}
```

### Common Error Codes

- `INVALID_CREDENTIALS` - Wrong email/password
- `USER_NOT_FOUND` - User doesn't exist
- `USER_ALREADY_EXISTS` - Email already registered
- `UNAUTHORIZED_ACCESS` - Missing/invalid token
- `VALIDATION_ERROR` - Invalid input data
- `RESOURCE_NOT_FOUND` - Resource doesn't exist
- `INTERNAL_ERROR` - Server error

---

## Response Formats

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
  "errors": ["Field error 1"],
  "code": "ERROR_CODE"
}
```

---

## Authentication

All protected endpoints require the `Authorization` header:

```
Authorization: Bearer {accessToken}
```

Tokens are valid for 15 minutes. Use the refresh token endpoint to get new tokens before expiry.
