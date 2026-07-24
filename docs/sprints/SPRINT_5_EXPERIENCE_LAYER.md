# Sprint 5 - Experience Layer (CRITICAL)

## Overview

Create an orchestration layer that ties all platform modules together into a unified member experience. This is the lead engineer's top recommendation for differentiating PBT.

## Goals

- Build dashboard aggregator
- Implement recommendation engine
- Create unified activity feed
- Build opportunity discovery engine

## Critical Modules

### 1. Dashboard Aggregator
Consolidate all member data into single endpoint:
- Continue growth journey (from progress)
- Upcoming events (from events module)
- Recommended resources (from learning)
- Industry insights (from insights)
- Notifications (from notifications)
- Power team updates
- Suggested connections
- Mentor activity

### 2. Recommendation Engine
Personalized recommendations for:
- Programmes based on profile and progress
- Events based on interests and location
- Mentors based on goals
- Resources based on learning path
- Power teams based on expertise
- Industry insights based on interests

### 3. Unified Activity Feed
Single activity stream for:
- Learning progress
- Community interactions
- Event attendance
- Mentorship sessions
- Resource access
- Success stories

### 4. Opportunity Engine
Recommend:
- Networking opportunities
- Collaboration projects
- Partnership opportunities
- Industry events
- Speaking opportunities
- Joint ventures

### 5. Member Home
Personalized landing page with:
- Dashboard summary
- Recent activity
- Recommended next steps
- Quick actions

### 6. Discover Page
Exploration interface for:
- New programmes
- Trending resources
- Upcoming events
- Featured mentors
- Active discussions

## Core Services

### DashboardService
- Aggregates data from all modules
- Calculates personalization
- Manages cache

### RecommendationService
- Tracks member activity
- Builds recommendation models
- Scores items

### ActivityFeedService
- Creates unified event stream
- Filters and sorts activities
- Manages notifications

### OpportunityService
- Identifies opportunities
- Ranks by relevance
- Sends recommendations

## API Endpoints

### Dashboard (2 endpoints)
- GET /api/v1/dashboard (complete profile view)
- GET /api/v1/dashboard/summary (lightweight version)

### Recommendations (4 endpoints)
- GET /api/v1/recommendations/programmes
- GET /api/v1/recommendations/events
- GET /api/v1/recommendations/mentors
- GET /api/v1/recommendations/resources

### Activity Feed (2 endpoints)
- GET /api/v1/activity-feed
- GET /api/v1/activity-feed/filtered

### Opportunities (1 endpoint)
- GET /api/v1/opportunities

### Discovery (2 endpoints)
- GET /api/v1/discover
- GET /api/v1/discover/trending

## Packages

New package required:
- `bull@4.x` - Job queue for background recommendation calculations

## Implementation Timeline

Estimated: 5-6 days
Files to create: 30+
API endpoints: 11+
Core services: 4

## Why This Matters

Quote from lead engineer:
> "This sprint is what I believe will make PBT exceptional. Instead of members jumping between modules, they experience a unified platform that actively creates value and opportunities for them."

This transforms PBT from a membership site into a professional operating system.
