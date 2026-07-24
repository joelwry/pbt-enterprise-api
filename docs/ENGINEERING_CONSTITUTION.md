
# PBT Engineering Constitution

**Version 1.0**

*"Building the Future of Professional Business Growth"*

---

# The Purpose

This document defines the engineering philosophy, product principles, architectural standards, and development rules that every contributor to the PBT platform must follow.

It applies equally to:

* Human developers
* AI coding assistants
* Architects
* UI designers
* Backend developers
* Frontend developers
* QA engineers
* DevOps engineers

Every line of code written for PBT must reinforce these principles.

---

# Chapter 1 — Our Mission

## Why PBT Exists

PBT exists to help professionals, entrepreneurs, investors, and business-minded individuals grow through knowledge, networking, mentorship, opportunities, and industry intelligence.

We are not building software.

We are building an ecosystem that helps members become more successful.

Technology is only the vehicle.

Members are the destination.

---

# Chapter 2 — Product Identity

## The First Rule

**PBT is NOT an LMS.**

Never think of PBT as:

* Udemy
* Moodle
* Teachable
* Coursera

Learning exists inside PBT.

Learning is not PBT.

---

## What PBT Actually Is

PBT is:

A Professional Business Ecosystem.

Members should feel like they have entered a living business community.

Not an online classroom.

---

## Every Feature Must Answer

Before building anything ask:

> Does this make members feel like they are growing professionally?

If not,

rethink the feature.

---

# Chapter 3 — The Member Experience

Members should always feel they are:

Learning.

Growing.

Networking.

Discovering.

Collaborating.

Applying knowledge.

Finding opportunities.

Receiving guidance.

Building businesses.

Every feature should strengthen one or more of these experiences.

---

# Chapter 4 — Engineering Philosophy

We do not build pages.

We build experiences.

We do not build CRUD.

We build workflows.

We do not build modules.

We build journeys.

---

# Chapter 5 — Core Engineering Principles

## Principle 1

Business comes before technology.

Technology exists to serve the business.

Never the other way around.

---

## Principle 2

Every module should reinforce the ecosystem.

No isolated features.

Everything should connect.

---

## Principle 3

The dashboard is the member's home.

It is not a collection of widgets.

It is the member's professional command center.

---

## Principle 4

Members should never wonder:

"What should I do next?"

The platform should guide them.

---

## Principle 5

Every recommendation should have a reason.

Never recommend randomly.

Recommend because it helps members grow.

---

# Chapter 6 — Domain Language

Never think:

Student

Teacher

Course

Classroom

Homework

Quiz

Instead think:

Member

Mentor

Programme

Knowledge Hub

Growth Journey

Business Resource

Industry Insight

Power Team

Opportunity

Networking

Professional Development

Words shape products.

---

# Chapter 7 — Architecture Principles

PBT follows Modular Architecture.

Every feature owns its own:

Controllers

Services

Repositories

Validation

Routes

Models

Tests

Documentation

No feature should directly depend on another feature's internals.

Communication happens through services and interfaces.

---

# Chapter 8 — Roles vs Subscriptions

These are NOT the same.

Roles define responsibility.

Subscriptions define access.

Roles:

Member

Leader

Mentor

Admin

Super Admin

Subscriptions:

PBT Pathway

PBT Plus

PBT Mentorship

Never mix the two.

---

# Chapter 9 — Entitlements

Permissions should not be hardcoded.

Instead:

Subscription

↓

Entitlements

↓

Permissions

Controllers should never know subscription rules.

The Entitlement Service should.

---

# Chapter 10 — API Philosophy

APIs exist for frontend experiences.

Not database tables.

Avoid exposing CRUD unnecessarily.

Instead build:

Dashboard APIs

Growth APIs

Discovery APIs

Journey APIs

Recommendation APIs

Experience APIs.

---

# Chapter 11 — Frontend Philosophy

The frontend should assemble interfaces.

The backend should assemble business logic.

Never move business rules into React.

---

# Chapter 12 — Backend Philosophy

Controllers should be thin.

Services should contain business rules.

Repositories should contain persistence.

Utilities should remain generic.

No duplicated business logic.

---

# Chapter 13 — Database Philosophy

Database schema exists to support business.

Not the UI.

Never expose raw Mongo documents.

Always map through DTOs.

---

# Chapter 14 — Security Philosophy

Security is a feature.

Not an afterthought.

Every endpoint must answer:

Who is calling?

What can they access?

Should they access it?

Why?

---

# Chapter 15 — Performance Philosophy

Optimize experiences.

Not benchmarks.

Members care about speed.

Not clever code.

---

# Chapter 16 — Observability

Every production issue should answer:

What happened?

Why?

Who was affected?

When?

Every request should be traceable.

---

# Chapter 17 — The Experience Layer

This is the future of PBT.

Instead of:

Learning

Community

Events

Resources

Think:

Today's Growth

Continue Journey

Upcoming Opportunities

Recommended Connections

Industry Intelligence

Mentor Guidance

Power Team Activity

Everything should converge into one experience.

---

# Chapter 18 — The Dashboard Philosophy

The dashboard is not navigation.

The dashboard is guidance.

When members log in they should immediately understand:

Where they are.

What has changed.

What they should do next.

Why it matters.

---

# Chapter 19 — AI Principles

AI should never replace human judgment.

AI should amplify member success.

Every AI feature must answer:

Does this genuinely help members grow?

If not,

it should not exist.

---

# Chapter 20 — Future Thinking

When adding new features ask:

Will this still make sense in five years?

Will this make the ecosystem stronger?

Will this create technical debt?

Can another developer understand this?

Can another AI continue this work?

---

# Chapter 21 — Engineering Decision Checklist

Before merging any feature, ask:

### Business

* Does this reinforce the PBT mission?
* Does this improve the member journey?
* Does it feel like a professional business ecosystem?

### Architecture

* Is it modular?
* Is it maintainable?
* Is business logic centralized?
* Does it follow our API standards?

### Performance

* Will it scale?
* Is it efficient?
* Is it observable?

### Security

* Is authorization correct?
* Are permissions centralized?
* Is member data protected?

### Experience

* Does this make members feel they are growing?
* Does it create opportunities?
* Does it guide the next action?

If any answer is "No," revisit the design before implementation.

---

# Chapter 22 — The PBT Engineering Oath

Every contributor to PBT commits to the following:

> **We do not build isolated software features. We build an interconnected professional business ecosystem. Every decision we make must help members learn, grow, connect, discover opportunities, and succeed. We value clarity over cleverness, maintainability over shortcuts, security over convenience, and member outcomes over technical novelty. We write code that future developers can understand, future AI assistants can extend, and future members can trust.**

---

# My Final Recommendation: Make This a Living Document

I would actually split this into **three documents** that become the foundation of all development work:

1. **PBT Engineering Constitution** (this document) — *Why and how we build.*
2. **PBT Architecture Handbook** — *Technical architecture, coding standards, folder structure, API conventions, database patterns, testing, deployment, and security.*
3. **PBT Domain Bible** — *The definitive source of business terminology and rules: Pathway, Plus, Mentorship, Power Teams, Mentors, Leaders, Industry Insights, Growth Journeys, Opportunities, memberships, entitlements, workflows, and member lifecycle.*

This trio becomes the "source of truth" for everyone—whether it's a senior engineer, a new hire, or an AI coding assistant like Claude, DeepSeek, or ChatGPT. Before anyone writes code, they first understand **what PBT is, how PBT is built, and what PBT means**. That consistency is what turns a collection of features into a coherent, long-lasting platform.
