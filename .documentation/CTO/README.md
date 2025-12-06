# CTO Documentation - Durdle Platform

**Last Updated**: December 6, 2025
**Version**: 1.0
**Owner**: CTO

---

## Welcome to the Durdle Platform Bible

This folder contains the **definitive technical reference** for the entire Durdle platform - from infrastructure to frontend, business logic to deployment procedures. Every document is designed to answer the question: **"How does this platform work, and how do I work on it safely?"**

---

## Quick Start Guide

**New to the Platform?** Start here:
1. Read [CTO_PLATFORM_OVERVIEW.md](CTO_PLATFORM_OVERVIEW.md) - Understand what Durdle is and why it exists
2. Skim [CTO_TECHNICAL_REFERENCE.md](CTO_TECHNICAL_REFERENCE.md) - Familiarize yourself with services and APIs
3. Review [CTO_DEVELOPMENT_GUIDE.md](CTO_DEVELOPMENT_GUIDE.md) - Set up your dev environment

**Working on a Feature?**
- Use [CTO_TECHNICAL_REFERENCE.md](CTO_TECHNICAL_REFERENCE.md) to find which Lambda/API to modify
- Follow [CTO_DEVELOPMENT_GUIDE.md](CTO_DEVELOPMENT_GUIDE.md) for step-by-step implementation

**Making Architecture Decisions?**
- Review [CTO_ARCHITECTURE_DECISIONS.md](CTO_ARCHITECTURE_DECISIONS.md) to understand past decisions
- Follow the same decision framework for new choices

---

## Document Index

### 1. CTO Platform Overview
**File**: [CTO_PLATFORM_OVERVIEW.md](CTO_PLATFORM_OVERVIEW.md)
**Purpose**: Executive summary and business context
**Audience**: CTOs, Product Managers, Technical Leadership, New Team Members

**What's Inside**:
- What is Durdle? (Business mission, problem solved)
- Platform capabilities (current state, roadmap)
- Technology philosophy (core principles)
- Architecture at a glance
- Platform metrics & scale (costs, performance)
- Platform services overview (8 Lambda functions, 4 DynamoDB tables)
- Critical business logic (pricing engine with 3 models)
- Security & compliance (GDPR, PCI DSS, AWS security)
- Development workflow
- Roadmap & strategic direction
- Risk register & mitigations
- Success metrics & KPIs
- Team structure & ownership
- Documentation index

**When to Read**:
- Onboarding to the platform
- Presenting platform to stakeholders
- Planning strategic roadmap
- Making technology investment decisions

---

### 2. CTO Technical Reference
**File**: [CTO_TECHNICAL_REFERENCE.md](CTO_TECHNICAL_REFERENCE.md)
**Purpose**: Quick lookup guide for all services, APIs, schemas, and configurations
**Audience**: Developers, DevOps, QA Engineers

**What's Inside**:
- **8 Lambda Functions**: Detailed specs (memory, timeout, responsibilities, dependencies, env vars, when to modify)
- **15 API Endpoints**: Request/response schemas, error codes, usage examples
- **4 DynamoDB Tables**: Schemas, access patterns, composite key construction
- **Environment Variables & Secrets**: All config values and retrieval methods
- **AWS Resources Registry**: ARNs, IDs, regions for all resources
- **Google Maps APIs**: Distance Matrix, Places Autocomplete, Directions (usage, costs)
- **Frontend Components**: File paths, responsibilities, key components
- **Common Development Workflows**: Adding Lambdas, APIs, pricing models, testing
- **Performance Benchmarks**: Cold start times, API latency, throughput
- **Troubleshooting Guide**: Common errors and solutions
- **Quick Commands**: Deploy, query DB, view logs, update secrets

**When to Read**:
- Implementing a new feature (which Lambda to modify?)
- Debugging API errors (which endpoint is failing?)
- Understanding database schema (which table stores quotes?)
- Setting up environment variables
- Finding AWS resource IDs

---

### 3. CTO Architecture Decisions
**File**: [CTO_ARCHITECTURE_DECISIONS.md](CTO_ARCHITECTURE_DECISIONS.md)
**Purpose**: Technical decision rationale and trade-off analysis
**Audience**: CTOs, Tech Leads, Senior Engineers, Architects

**What's Inside**:
- **Decision Framework**: 6 criteria for evaluating all tech choices
- **11 Major Decisions** with detailed analysis:
  1. Frontend Framework (Next.js 14)
  2. Backend Architecture (Serverless Lambda)
  3. Database (DynamoDB)
  4. Authentication (JWT vs Cognito)
  5. Styling (Tailwind CSS)
  6. Hosting (AWS Amplify)
  7. Maps Provider (Google Maps)
  8. Deployment Strategy (Manual CLI → SAM)
  9. Programming Language (Node.js + TypeScript)
  10. Infrastructure as Code (AWS SAM)
  11. Lambda Architecture (arm64 Graviton2)

**Each Decision Includes**:
- Context (why we needed to choose)
- Options Evaluated (comparison table with pros/cons)
- Decision Made
- Rationale (why we chose this option)
- Trade-offs (what we accepted, what we rejected)
- Review Date (when to re-evaluate)

**When to Read**:
- Making new architecture decisions (follow the framework)
- Understanding why we chose specific technologies
- Evaluating if a decision should be reversed
- Onboarding senior engineers (context on platform design)
- Planning major refactors or migrations

---

### 4. CTO Development Guide
**File**: [CTO_DEVELOPMENT_GUIDE.md](CTO_DEVELOPMENT_GUIDE.md)
**Purpose**: Practical guide for adding features safely without breaking things
**Audience**: All Developers, QA Engineers, DevOps

**What's Inside**:
- **Development Environment Setup**: Prerequisites, local setup, VS Code extensions
- **Code Standards & Best Practices**:
  - Sacred Principles (No Emojis, One Lambda = One Job, TypeScript Strict, Production-Grade)
  - TypeScript standards, naming conventions, git commit messages, code comments
- **Adding New Features**:
  - 10-step feature development workflow
  - Real example: Adding surge pricing (backend + frontend + testing + deployment)
- **Testing Guidelines**: Manual testing checklist, test cases, error handling tests
- **Deployment Process**: Pre-deployment checklist, Lambda deployment, frontend deployment, rollback procedures
- **Debugging & Troubleshooting**: CloudWatch logs, common errors and solutions, local debugging
- **Common Development Tasks**: Adding vehicles, fixed routes, admin users, updating env vars, rotating secrets
- **Security Checklist**: Input validation, auth, XSS, CSRF, secrets, error messages, logging
- **Performance Optimization**: Lambda cold starts, DynamoDB queries, frontend bundle size

**When to Read**:
- Starting development work on the platform
- Adding a new feature (step-by-step guide)
- Debugging production issues
- Deploying code changes
- Optimizing performance
- Reviewing code for security

---

## How to Use This Documentation

### For Different Roles

**CTO / Technical Leadership**:
1. Start with [CTO_PLATFORM_OVERVIEW.md](CTO_PLATFORM_OVERVIEW.md) for business context
2. Review [CTO_ARCHITECTURE_DECISIONS.md](CTO_ARCHITECTURE_DECISIONS.md) for technical rationale
3. Check risk register and roadmap in Overview
4. Use Technical Reference for deep dives on specific components

**Full-Stack Developer**:
1. Read [CTO_DEVELOPMENT_GUIDE.md](CTO_DEVELOPMENT_GUIDE.md) to set up environment
2. Use [CTO_TECHNICAL_REFERENCE.md](CTO_TECHNICAL_REFERENCE.md) to find which Lambda/API to modify
3. Follow Development Guide workflows for adding features
4. Reference Architecture Decisions when making technical choices

**Frontend Developer**:
1. Read Overview → "Frontend Components" section
2. Use Technical Reference → "Frontend Components Reference"
3. Follow Development Guide → "Adding New Features" (frontend steps)
4. Reference Architecture Decisions → "Frontend Framework" and "Styling"

**Backend Developer**:
1. Read Overview → "Platform Services" section
2. Use Technical Reference → "Lambda Functions Reference"
3. Follow Development Guide → "Deploying Lambda Functions"
4. Reference Architecture Decisions → "Backend Architecture" and "Database"

**DevOps / Infrastructure**:
1. Read Overview → "Architecture at a Glance"
2. Use Technical Reference → "AWS Resources Registry"
3. Follow Development Guide → "Deployment Process"
4. Reference Architecture Decisions → "Deployment Strategy" and "Infrastructure as Code"

**QA / Testing**:
1. Read Overview → "Platform Capabilities"
2. Use Technical Reference → "API Endpoints Reference"
3. Follow Development Guide → "Testing Guidelines"
4. Reference Development Guide → "Common Development Tasks" for test data setup

---

## Common Use Cases

### "I need to add surge pricing"
1. Read [CTO_DEVELOPMENT_GUIDE.md](CTO_DEVELOPMENT_GUIDE.md) → "Example: Adding Surge Pricing"
2. Use [CTO_TECHNICAL_REFERENCE.md](CTO_TECHNICAL_REFERENCE.md) → "quotes-calculator" Lambda
3. Follow step-by-step: backend logic → frontend UI → testing → deployment

### "Which Lambda handles vehicle pricing?"
1. Open [CTO_TECHNICAL_REFERENCE.md](CTO_TECHNICAL_REFERENCE.md)
2. Search for "pricing-manager" Lambda
3. See: responsibilities, env vars, API endpoints, when to modify

### "Why did we choose DynamoDB over PostgreSQL?"
1. Open [CTO_ARCHITECTURE_DECISIONS.md](CTO_ARCHITECTURE_DECISIONS.md)
2. Navigate to "Database: DynamoDB"
3. See: cost comparison (£8 vs £40), options evaluated, rationale, trade-offs

### "How do I deploy a Lambda function?"
1. Open [CTO_DEVELOPMENT_GUIDE.md](CTO_DEVELOPMENT_GUIDE.md)
2. Navigate to "Deployment Process → Deploying Lambda Functions"
3. Follow 5-step process: build → package → deploy → verify → test

### "What's the quote calculation formula?"
1. Open [CTO_PLATFORM_OVERVIEW.md](CTO_PLATFORM_OVERVIEW.md)
2. Navigate to "Critical Business Logic: Pricing Engine"
3. See: 3 pricing models with formulas and examples
4. For deeper dive: See `Pricing_Engine_Logic.md` in main documentation

### "How much does the platform cost at scale?"
1. Open [CTO_PLATFORM_OVERVIEW.md](CTO_PLATFORM_OVERVIEW.md)
2. Navigate to "Platform Metrics & Scale"
3. See: MVP costs (£28/month), 10x scale costs (£153/month), breakdown

---

## Maintenance Guidelines

### Updating Documentation

**When to Update**:
- After implementing new features (update Technical Reference with new APIs/Lambdas)
- After changing architecture (update Architecture Decisions with new rationale)
- After discovering new best practices (update Development Guide)
- After roadmap changes (update Platform Overview)

**How to Update**:
1. Edit relevant .md file
2. Update "Last Updated" date at top
3. Increment version number if major changes
4. Git commit with message: "Update CTO docs: [what changed]"

**Review Schedule**:
- **Weekly**: Update Technical Reference with new APIs/endpoints
- **Monthly**: Review Development Guide for new best practices
- **Quarterly**: Review Architecture Decisions (are they still valid?)
- **Per Phase**: Update Platform Overview roadmap

---

## Related Documentation

**Main Documentation Folder**: `C:\VSProjects\_Websites\Durdle\.documentation\`

**Complementary Docs** (not in CTO folder):
- **TechnicalArchitecture.md** (673 lines) - Full system design deep dive
- **Pricing_Engine_Logic.md** (453 lines) - Pricing formulas with edge cases
- **APISpecification.md** (869 lines) - Complete OpenAPI-style REST API docs
- **DatabaseSchema.md** (500+ lines) - DynamoDB patterns and indexes
- **QUOTE_WIZARD_IMPLEMENTATION_SPEC.md** - Frontend component architecture
- **PHASE2_PRICING_AND_ADMIN.md** - Admin portal implementation details
- **DeploymentRunbook.md** - Step-by-step deployment procedures
- **SecurityCompliance.md** - GDPR, PCI DSS, AWS security policies
- **InitialPRD.md** - Original product requirements
- **UserStories.md** - Customer journey maps

**Relationship**:
- CTO docs = **High-level reference** for executives, leads, and new team members
- Main docs = **Deep technical specs** for implementation and edge cases

---

## Document Status

| Document | Status | Last Updated | Next Review |
|----------|--------|--------------|-------------|
| CTO_PLATFORM_OVERVIEW.md | Complete | Dec 6, 2025 | Q1 2026 (Phase 3 start) |
| CTO_TECHNICAL_REFERENCE.md | Complete | Dec 6, 2025 | Weekly (as APIs added) |
| CTO_ARCHITECTURE_DECISIONS.md | Complete | Dec 6, 2025 | Quarterly |
| CTO_DEVELOPMENT_GUIDE.md | Complete | Dec 6, 2025 | Monthly (best practices) |

---

## Feedback & Contributions

**Found an Error?** Update the relevant .md file and commit with clear message.

**Missing Information?** Add it following the existing structure and formatting.

**Outdated Decision?** Update Architecture Decisions with new context and rationale.

**New Best Practice?** Add to Development Guide with example code.

---

## Quick Reference Card

**One-Liner for Each Doc**:

| Document | One-Liner |
|----------|-----------|
| **Platform Overview** | "What is Durdle and how does it work?" |
| **Technical Reference** | "Which Lambda/API do I modify for feature X?" |
| **Architecture Decisions** | "Why did we choose technology X over Y?" |
| **Development Guide** | "How do I add a feature without breaking things?" |

---

## Contact

**Questions?** Contact:
- **CTO**: [Your contact info]
- **Tech Lead**: [Tech Lead contact]
- **Platform Docs**: [GitHub/Slack channel]

---

**END OF CTO DOCUMENTATION INDEX**

*Last Updated: December 6, 2025*
*Version: 1.0*
*Maintained by: CTO*
