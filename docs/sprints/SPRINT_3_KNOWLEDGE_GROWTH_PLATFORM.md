# Sprint 3 — Knowledge & Growth Platform

## Overview

Sprint 3 transforms PBT from a traditional LMS into a business growth platform. Instead of thinking in terms of courses/lessons/quizzes, we think in terms of growth journeys, business outcomes, and continuous professional development.

## Mental Model Shift

### Before (Traditional LMS)
```
Course → Lesson → Quiz → Certificate
```

### After (Business Growth Platform)
```
Knowledge Hub
    ↓
Programme (Multi-pathway)
    ↓
Growth Journey (Personalized progression)
    ↓
Business Resources (Videos, templates, playbooks)
    ↓
Business Outcomes (Real-world results)
```

## Key Features

### 1. Content Relationships
Connect related content across modules:
- Programmes to Resources
- Programmes to Events
- Resources to Mentors
- Events to Industry Insights
- Power Teams to Programmes
- Learning to Real-world Applications

### 2. Progress Engine
Track meaningful metrics:
- Programme progress (% completed)
- Resource engagement (views, downloads)
- Growth milestones (checkpoints)
- Event participation
- Saved content (bookmarks)
- Continue journey (where left off)

NOT just "lesson completed" binary tracking.

### 3. Enhanced Resource Types
Support diverse content:
- Videos (YouTube embeds)
- PDFs (downloadable)
- Templates (editable)
- Checklists (interactive)
- Toolkits (multi-file)
- Case Studies (deep dives)
- Business Playbooks (step-by-step)
- Industry Reports (data-driven)
- External Resources (linked)

### 4. Learning Pathways
Non-linear learning:
- Recommended next steps
- Alternative paths
- Prerequisite tracking
- Parallel learning paths
- Business outcome mapping

## Packages Required for Sprint 3

### New Packages (3 total)

```bash
pnpm add mongoose-aggregate-paginate@3.4.0
```

| Package | Version | Purpose | Category |
|---------|---------|---------|----------|
| mongoose-aggregate-paginate | 3.4.0 | Advanced pagination for aggregations | Database |

### Already Available
- mongoose (schema definitions)
- zod (validation)
- winston (logging)
- ioredis (caching from Sprint 2)

## Files to Create (Sprint 3)

### Schemas (8 files)
1. `src/modules/programmes/schemas/Programme.schema.ts` - Main programme definition
2. `src/modules/programmes/schemas/ProgrammeContent.schema.ts` - Content relationships
3. `src/modules/resources/schemas/Resource.enhanced.ts` - Enhanced with new types
4. `src/modules/progress/schemas/UserProgress.schema.ts` - Comprehensive progress tracking
5. `src/modules/progress/schemas/Milestone.schema.ts` - Growth milestones
6. `src/modules/content/schemas/ContentRelationship.schema.ts` - Cross-module relationships
7. `src/modules/bookmarks/schemas/Bookmark.schema.ts` - Saved content
8. `src/modules/journeys/schemas/LearningJourney.schema.ts` - Personalized paths

### Services (6 files)
1. `src/modules/programmes/services/programme.service.ts` - Programme management
2. `src/modules/progress/services/progress.service.ts` - Progress tracking
3. `src/modules/progress/services/milestone.service.ts` - Milestone management
4. `src/modules/content/services/contentRelationship.service.ts` - Content connections
5. `src/modules/bookmarks/services/bookmark.service.ts` - Bookmark management
6. `src/modules/journeys/services/journey.service.ts` - Journey orchestration

### Controllers (4 files)
1. `src/modules/programmes/controllers/programme.controller.ts`
2. `src/modules/progress/controllers/progress.controller.ts`
3. `src/modules/bookmarks/controllers/bookmark.controller.ts`
4. `src/modules/journeys/controllers/journey.controller.ts`

### Routes (4 files)
1. `src/modules/programmes/routes/programme.routes.ts`
2. `src/modules/progress/routes/progress.routes.ts`
3. `src/modules/bookmarks/routes/bookmark.routes.ts`
4. `src/modules/journeys/routes/journey.routes.ts`

### Utilities (3 files)
1. `src/core/content/ContentMapper.ts` - Map resources across types
2. `src/core/progress/ProgressCalculator.ts` - Calculate progress percentages
3. `src/core/journey/JourneyOrchestrator.ts` - Build personalized paths

## API Endpoints (Sprint 3)

### Programmes
```
GET    /api/v1/programmes              - List all programmes
GET    /api/v1/programmes/:id          - Get programme details
POST   /api/v1/programmes              - Create programme (admin)
PUT    /api/v1/programmes/:id          - Update programme (admin)
GET    /api/v1/programmes/:id/content  - Get programme content
POST   /api/v1/programmes/:id/enroll   - Enroll in programme (protected)
```

### Progress
```
GET    /api/v1/progress/user           - Get user's all progress (protected)
GET    /api/v1/progress/programme/:id  - Get programme progress (protected)
POST   /api/v1/progress/update         - Update progress (protected)
GET    /api/v1/progress/milestones     - Get user milestones (protected)
POST   /api/v1/progress/milestone      - Mark milestone (protected)
```

### Bookmarks (Saved Content)
```
POST   /api/v1/bookmarks               - Save content (protected)
GET    /api/v1/bookmarks               - Get saved content (protected)
DELETE /api/v1/bookmarks/:id           - Remove bookmark (protected)
```

### Journeys (Personalized Paths)
```
GET    /api/v1/journeys/recommended    - Get recommended next steps (protected)
GET    /api/v1/journeys/current        - Get current journey (protected)
POST   /api/v1/journeys/:id/start      - Start learning journey (protected)
```

## Database Schema Changes

### New Collections
1. **programmes** - Learning programmes (renamed from modules)
2. **programme_content** - Content items within programmes
3. **user_progress** - User progress per item
4. **milestones** - Achievement checkpoints
5. **content_relationships** - Links between resources/events/programmes
6. **bookmarks** - Saved content
7. **learning_journeys** - Personalized learning paths

### Modified Collections
- **resources** - Added content type classification
- **users** - Added learning preferences

## Implementation Strategy

### Phase 1: Schemas & Services (Day 1-2)
- Create all schema definitions
- Implement core services
- Build relationships between models

### Phase 2: Controllers & Routes (Day 2-3)
- Implement API endpoints
- Add proper authentication/authorization
- Test CRUD operations

### Phase 3: Content Mapping (Day 3-4)
- Build relationship system
- Implement content discovery
- Create recommendation logic

### Phase 4: Progress Engine (Day 4-5)
- Implement progress calculation
- Create milestone tracking
- Build journey orchestration

### Phase 5: Testing & Documentation (Day 5)
- Integration tests
- API documentation
- User guides

## Key Improvements Over Sprint 2

| Aspect | Sprint 2 | Sprint 3 |
|--------|----------|---------|
| Learning Model | Linear courses | Non-linear journeys |
| Progress Tracking | Binary (complete/incomplete) | Nuanced (%) |
| Content | Isolated modules | Connected resources |
| User Experience | Passive consumption | Active growth |
| Recommendations | None | Personalized paths |
| Milestones | Course completion | Business outcomes |

## Business Impact

### What Members Will Experience
1. **Continuous Learning** - Instead of finishing a course, they continue on guided journeys
2. **Practical Outcomes** - Resources tied to real business results
3. **Personalization** - Recommended next steps based on activity
4. **Flexibility** - Multiple learning paths to same goal
5. **Progress Visibility** - See exactly where they are in their growth
6. **Milestone Recognition** - Celebrate meaningful achievements

### Competitive Advantage
- Feels like a professional operating system, not an LMS
- Members experience active growth, not passive consumption
- Stronger member engagement = higher retention

## Success Metrics

After Sprint 3, measure:
1. **Engagement** - Time spent in journeys vs courses
2. **Completion** - Users reaching milestones
3. **Retention** - Members staying active
4. **Progression** - Users advancing through tiers
5. **Satisfaction** - NPS score improvement

## Dependency Graph

Sprint 3 requires:
- Sprint 1: Foundation & error codes ✓
- Sprint 2: Subscriptions & entitlements ✓
- NO external dependencies beyond what's installed

## Testing Checklist

- [ ] Create programme and verify schema
- [ ] Enroll user and track progress
- [ ] Calculate correct progress percentages
- [ ] Create content relationships
- [ ] Verify journey recommendations
- [ ] Bookmark content and retrieve
- [ ] Track milestones correctly
- [ ] Integration with entitlements

## Documentation Outputs

After Sprint 3:
1. Updated API documentation
2. Journey mapping guide
3. Progress calculation documentation
4. Content relationship mapping guide
5. Migration guide (if updating from Sprint 2)

## Timeline

- **Start:** After Sprint 2 complete
- **Duration:** 2-3 working days
- **Critical Path:** Schemas → Services → Controllers
- **Optional Enhancements:** Caching, recommendation algorithms

## Next Phase (Sprint 4)

After Sprint 3 is complete, Sprint 4 will:
- Add networking features
- Implement mentorship
- Build Power Teams ecosystem
- Create industry insights module

These are built ON TOP of Sprint 3's foundation.

---

**Goal:** Transform PBT from an LMS into a professional business growth platform that members return to daily.
