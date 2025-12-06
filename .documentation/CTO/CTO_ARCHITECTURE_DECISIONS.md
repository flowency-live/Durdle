# CTO Architecture Decisions - Durdle Platform

**Document Version:** 1.0
**Last Updated:** December 6, 2025
**Purpose:** Technical decision rationale and trade-off analysis for all major architecture choices

---

## Decision Framework

All architecture decisions for Durdle follow this evaluation criteria:

1. **Cost Efficiency**: Minimize infrastructure costs at MVP and scale
2. **Developer Velocity**: Enable rapid feature development and iteration
3. **Operational Simplicity**: Minimize infrastructure maintenance overhead
4. **Scalability**: Handle 10x growth without re-architecture
5. **Security**: Production-grade security from day 1
6. **Vendor Lock-in**: Balance AWS ecosystem benefits vs portability

**Decision Record Format**: Each decision documented with Context, Options, Decision, Rationale, Trade-offs, and Review Date.

---

## Table of Contents

- [Frontend Framework](#frontend-framework-nextjs-14)
- [Backend Architecture](#backend-architecture-serverless-lambda)
- [Database](#database-dynamodb)
- [Authentication](#authentication-jwt-vs-cognito)
- [Styling](#styling-tailwind-css)
- [Hosting](#hosting-aws-amplify)
- [Maps Provider](#maps-provider-google-maps)
- [Deployment Strategy](#deployment-strategy)
- [Programming Language](#programming-language-nodejs-typescript)
- [Infrastructure as Code](#infrastructure-as-code)
- [Lambda Architecture](#lambda-architecture-arm64)

---

## Frontend Framework: Next.js 14

### Context
Needed a modern React framework for server-side rendering, SEO, and optimal performance for a customer-facing transport booking platform.

### Options Evaluated

| Framework | Pros | Cons |
|-----------|------|------|
| **Next.js 14 (App Router)** | Server components, excellent SEO, Amplify native support, mature ecosystem | Learning curve for App Router, opinionated structure |
| **Remix** | Progressive enhancement, nested routing, excellent data loading | Smaller ecosystem, less AWS Amplify integration |
| **SvelteKit** | Smaller bundle size, simpler syntax, fast performance | Smaller talent pool, less enterprise adoption |
| **Create React App (CRA)** | Simple, unopinionated, widely known | No SSR/SSG, poor SEO, deprecated by React team |

### Decision: **Next.js 14 with App Router**

### Rationale
1. **SEO Critical**: Transport bookings start with Google searches; SSR ensures search visibility
2. **Server Components**: Reduce client bundle size by rendering on server (faster mobile load times)
3. **AWS Amplify Native**: Next.js is first-class citizen on Amplify (auto-deploy, edge optimization)
4. **Ecosystem Maturity**: Largest React framework; extensive community, plugins, examples
5. **Developer Hiring**: Easier to find Next.js developers vs Remix/SvelteKit

### Trade-offs

**Accepted**:
- Learning curve for App Router (new paradigm vs Pages Router)
- Opinionated file structure (app directory, route groups)
- Vendor coupling with Vercel ecosystem (though we use Amplify)

**Rejected**:
- Remix's progressive enhancement (not critical for our use case)
- SvelteKit's smaller bundle (Next.js server components mitigate this)

### Review Date
**Q2 2026** - Evaluate Next.js 15/16 features and migration path

---

## Backend Architecture: Serverless Lambda

### Context
Needed backend compute for API endpoints, quote calculations, Google Maps integration, and database operations. Traffic expected to be sporadic (quote requests) with unpredictable spikes.

### Options Evaluated

| Architecture | Pros | Cons |
|-------------|------|------|
| **AWS Lambda (Serverless)** | No server management, auto-scaling, pay per request, millisecond billing | Cold start latency, vendor lock-in, debugging complexity |
| **EC2 + Express.js** | Full control, consistent performance, no cold starts | Always-on cost, manual scaling, security patches, high ops burden |
| **ECS/Fargate (Containers)** | Consistent environment, no server management (ECS), portable | Higher cost than Lambda, still requires container orchestration |
| **Dedicated Server (DigitalOcean)** | Low fixed cost, simple deployment | Single point of failure, manual scaling, high ops burden |

### Decision: **AWS Lambda with Node.js 20.x (arm64)**

### Rationale
1. **Cost Optimization**: MVP with 500 quotes/month = £5/month Lambda cost vs £40/month EC2 minimum
2. **Auto-Scaling**: Handle 10x traffic spike (e.g., holiday season) without configuration changes
3. **Zero Ops**: No server patches, no OS updates, no infrastructure maintenance
4. **Granular Billing**: Pay only for compute time (milliseconds), not idle capacity
5. **AWS Ecosystem**: Native integration with API Gateway, DynamoDB, Secrets Manager, S3

### Trade-offs

**Accepted**:
- Cold start latency (~500-800ms for first request after idle period)
  - *Mitigation*: arm64 reduces cold starts by 15-20%; consider provisioned concurrency for critical endpoints
- Vendor lock-in to AWS Lambda
  - *Mitigation*: Business logic isolated in pure functions; could port to Cloud Run or Azure Functions if needed
- Debugging complexity vs local Express server
  - *Mitigation*: CloudWatch Logs, X-Ray tracing, local testing with SAM CLI

**Rejected**:
- EC2's consistent performance (not worth £400/year extra cost for millisecond improvement)
- Container portability (no multi-cloud requirement; AWS commitment accepted)

### Review Date
**Q3 2026** - Evaluate cold start impact on customer experience; consider provisioned concurrency

---

## Database: DynamoDB

### Context
Needed a database for vehicle pricing, fixed routes, admin users, quotes, and future bookings/payments. Data is mostly key-value lookups with occasional scans. No complex relational queries required.

### Options Evaluated

| Database | Pros | Cons |
|----------|------|------|
| **DynamoDB (On-Demand)** | £8/month at MVP scale, auto-scaling, single-digit ms latency, no server management | No complex queries, single-table design learning curve, vendor lock-in |
| **RDS PostgreSQL** | Relational model, SQL queries, familiar to developers | £40+/month minimum, manual scaling, backups, security patches |
| **RDS Aurora Serverless** | Auto-scaling SQL, pay per request | £60+/month minimum, higher latency than DynamoDB |
| **MongoDB Atlas** | Flexible schema, JSON-native, free tier | Third-party service, less AWS integration, cost scales quickly |

### Decision: **DynamoDB with Single-Table Design (On-Demand Billing)**

### Rationale
1. **Cost**: £8/month vs £40/month RDS (5x cheaper at MVP scale)
2. **Performance**: Single-digit millisecond latency vs 10-50ms SQL queries
3. **Scalability**: Auto-scales to millions of requests/month without configuration
4. **Serverless**: No server management, no backups to configure (continuous backups included)
5. **AWS Native**: Native Lambda integration, IAM security, VPC not required

### Single-Table Design Pattern
Instead of 4 separate tables (vehicles, routes, users, quotes), we use 1 table (durdle-main-table-dev) with partition key (PK) and sort key (SK):

```
PK: VEHICLE#standard    SK: METADATA
PK: ROUTE#ChIJ...       SK: DEST#ChIJ...#standard
PK: QUOTE#Q12345        SK: METADATA
PK: BOOKING#B67890      SK: METADATA
```

**Benefits**:
- Single table to manage
- Atomic transactions across entity types
- Lower cost (1 table vs 4)

**Trade-offs**:
- Steeper learning curve vs SQL
- Requires careful partition key design to avoid hot partitions

### Trade-offs

**Accepted**:
- No SQL queries (all access via primary key or scan)
  - *Mitigation*: Our access patterns are primarily key-value lookups (get vehicle by ID, get quote by ID)
- Single-table design complexity
  - *Mitigation*: Comprehensive documentation in DatabaseSchema.md; clear PK/SK conventions
- Vendor lock-in to DynamoDB
  - *Mitigation*: Repository pattern abstracts database layer; could migrate to Firestore or MongoDB if needed

**Rejected**:
- SQL's relational queries (no complex joins needed in our domain)
- PostgreSQL's familiarity (cost savings and performance outweigh familiarity)

### Review Date
**Q4 2026** - Evaluate DynamoDB costs at scale (10K+ quotes/month); consider Reserved Capacity pricing

---

## Authentication: JWT vs Cognito

### Context
Needed admin authentication for pricing management portal. Customer authentication is Phase 3 (not yet implemented).

### Options Evaluated

| Method | Pros | Cons |
|--------|------|------|
| **Custom JWT + bcryptjs** | Lightweight, no extra infrastructure cost, full control | Manual implementation, no built-in MFA, session management complexity |
| **AWS Cognito User Pools** | Built-in MFA, OAuth, SAML, user management UI, session handling | £1/month minimum, additional service to manage, over-engineered for MVP |
| **Auth0** | Feature-rich, excellent DX, built-in social login | £23/month minimum, third-party dependency, overkill for admin-only auth |
| **NextAuth.js** | Next.js native, supports multiple providers | Requires database for sessions, complexity for simple admin auth |

### Decision: **Custom JWT + bcryptjs (Admin Auth)**

**Customer Auth (Phase 3)**: Likely AWS Cognito for customer accounts (MFA, social login, forgot password flows)

### Rationale
1. **Cost**: £0 vs £1/month Cognito (small but unnecessary expense for 2-3 admin users)
2. **Simplicity**: Single Lambda function vs Cognito User Pool + Lambda triggers
3. **Control**: Custom token claims, flexible expiry (8 hours), role-based access
4. **Learning**: Building auth from scratch provides team expertise for customer auth later

### Implementation Details
- **Password Hashing**: bcryptjs with 10 rounds (industry standard)
- **Token Signing**: HS256 algorithm with 32-byte secret (stored in Secrets Manager)
- **Token Expiry**: 8 hours (balance between security and user convenience)
- **Storage**: httpOnly cookies (prevents XSS attacks)

### Trade-offs

**Accepted**:
- No built-in MFA (admin users trained on strong passwords)
  - *Future*: Add TOTP MFA in Phase 3 if needed
- No password reset flow (manually reset via DynamoDB update)
  - *Future*: Add email-based password reset in Phase 3
- Manual session management
  - *Future*: Add refresh tokens for longer sessions

**Rejected**:
- Cognito's built-in MFA (not needed for 2-3 trusted admin users)
- Auth0's social login (not relevant for admin portal)

### Review Date
**Q1 2026** - When implementing customer auth, evaluate Cognito vs custom JWT (likely Cognito for customers)

---

## Styling: Tailwind CSS

### Context
Needed a styling solution for rapid UI development with mobile-first responsive design.

### Options Evaluated

| Framework | Pros | Cons |
|-----------|------|------|
| **Tailwind CSS** | Rapid development, small bundle (purged unused classes), mobile-first, no runtime | HTML class clutter, learning curve for team |
| **styled-components** | Scoped styles, dynamic theming, JS-based | Runtime CSS-in-JS cost, larger bundle, slower |
| **CSS Modules** | Scoped styles, no runtime, simple | Manual responsive design, no utility classes |
| **Material UI** | Pre-built components, consistent design | Large bundle, opinionated design, hard to customize |

### Decision: **Tailwind CSS**

### Rationale
1. **Developer Velocity**: Build UI 3x faster with utility classes vs custom CSS
2. **Mobile-First**: Built-in responsive modifiers (sm:, md:, lg:) align with mobile-first design
3. **Bundle Size**: PurgeCSS removes unused classes; final CSS ~10KB vs 200KB+ MUI
4. **No Runtime**: Zero runtime cost vs styled-components (faster page loads)
5. **Customization**: Full design token control (colors, spacing, fonts) vs MUI constraints

### Trade-offs

**Accepted**:
- HTML class verbosity (e.g., `className="flex items-center justify-between px-4 py-2"`)
  - *Mitigation*: Extract common patterns into reusable components (Button, Card, etc.)
- Learning curve for non-Tailwind developers
  - *Mitigation*: Tailwind IntelliSense extension provides autocomplete and docs

**Rejected**:
- styled-components' JS-based theming (Tailwind's config.js provides same benefit without runtime cost)
- Material UI's pre-built components (too opinionated for custom brand identity)

### Review Date
**Q2 2026** - Evaluate Tailwind v4 migration path

---

## Hosting: AWS Amplify

### Context
Needed hosting for Next.js frontend with global CDN, automatic deployments, and AWS ecosystem integration.

### Options Evaluated

| Platform | Pros | Cons |
|----------|------|------|
| **AWS Amplify** | Native AWS integration, free tier (5GB), auto-deploy from GitHub, CloudFront CDN | Less Next.js optimization vs Vercel |
| **Vercel** | Best Next.js performance, edge functions, automatic optimization | £20/month for team features, vendor lock-in |
| **Netlify** | Generous free tier, excellent DX, form handling | Less AWS integration, edge functions limited |
| **S3 + CloudFront** | Full control, lowest cost | Manual deployment, no auto-deploy, more configuration |

### Decision: **AWS Amplify**

### Rationale
1. **Cost**: Free tier covers MVP (5GB bandwidth, 1000 build minutes)
2. **AWS Ecosystem**: Native integration with API Gateway, Cognito, Lambda (CORS, auth flows simplified)
3. **Auto-Deploy**: GitHub integration deploys on every push to main branch
4. **CloudFront CDN**: Global edge locations for fast load times worldwide
5. **SSL/TLS**: Automatic HTTPS with free SSL certificates

### Trade-offs

**Accepted**:
- Slightly slower Next.js builds vs Vercel (~30s vs 20s)
  - *Impact*: Negligible for MVP deployment frequency
- Less Next.js-specific optimization vs Vercel
  - *Mitigation*: Next.js App Router SSR/SSG still fully supported

**Rejected**:
- Vercel's edge runtime (not needed for our use case; API calls are backend Lambda)
- Netlify's form handling (we use API Gateway + Lambda for forms)

### Review Date
**Q3 2026** - Evaluate Amplify vs Vercel at scale (bandwidth costs, build time optimization)

---

## Maps Provider: Google Maps

### Context
Needed maps provider for location autocomplete, distance calculation, route visualization, and future turn-by-turn navigation.

### Options Evaluated

| Provider | Pros | Cons |
|----------|------|------|
| **Google Maps** | Best UK location data, comprehensive API suite (Places, Distance Matrix, Directions), 99.9% uptime | Higher cost ($5/1000 requests Distance Matrix), vendor lock-in |
| **Mapbox** | Beautiful custom maps, lower cost ($0.60/1000 requests), developer-friendly | UK location data less accurate, autocomplete less robust |
| **OpenStreetMap (OSM)** | Free, open-source, community-driven | Self-hosted infrastructure required, less accurate UK data, no commercial support |
| **HERE Maps** | Good UK data, competitive pricing, enterprise support | Smaller developer ecosystem, less familiar to team |

### Decision: **Google Maps (Distance Matrix, Places Autocomplete, Directions APIs)**

### Rationale
1. **Data Quality**: Google has best UK location database (addresses, POIs, postcodes)
2. **Autocomplete Accuracy**: Google Places Autocomplete handles misspellings, abbreviations better
3. **API Completeness**: Distance Matrix, Directions, Geocoding, Places all in one ecosystem
4. **Reliability**: 99.9% uptime SLA; critical for quote generation (failed API = lost customer)
5. **Future-Proof**: As we add features (driver navigation, route optimization), Google has APIs ready

### Cost Analysis (MVP at 500 quotes/month)

```
Distance Matrix API: 500 requests × $5/1000 = $2.50
Places Autocomplete: 1500 requests × $2.83/1000 = $4.25
---------------------------------------------------------
TOTAL: ~$7/month (£6/month)
```

**At Scale (5000 quotes/month)**:
```
Distance Matrix: 5000 × $5/1000 = $25
Places Autocomplete: 15000 × $2.83/1000 = $42.45
---------------------------------------------------------
TOTAL: ~$67/month (£55/month)
```

### Trade-offs

**Accepted**:
- Higher cost vs Mapbox (£6/month vs £1/month at MVP)
  - *Justification*: Data accuracy worth extra £5/month; incorrect routes = customer complaints
- Vendor lock-in to Google Maps
  - *Mitigation*: Abstract Maps API calls behind service layer; could swap to Mapbox if costs become prohibitive

**Rejected**:
- Mapbox's cost savings (data quality issues would hurt customer experience)
- OSM's free tier (self-hosting infrastructure negates cost savings)

### Review Date
**Q2 2026** - Evaluate Google Maps costs at scale; consider Mapbox for non-critical features (map display only)

---

## Deployment Strategy

### Context
Needed deployment pipeline for Lambda functions during rapid MVP development.

### Options Evaluated

| Strategy | Pros | Cons |
|----------|------|------|
| **Manual AWS CLI** | Fast iteration, no pipeline overhead, simple | Error-prone, no rollback, manual steps |
| **AWS SAM (Serverless Application Model)** | Infrastructure as code, automatic rollback, CloudFormation integration | Slower iteration, YAML configuration overhead |
| **GitHub Actions + SAM** | Automated CI/CD, testing before deploy, version control | Initial setup time, GitHub Actions minutes cost |
| **Serverless Framework** | Multi-cloud support, excellent plugins, large community | Third-party tool, less AWS-native than SAM |

### Decision: **Manual AWS CLI (Phase 1-2) → GitHub Actions + SAM (Phase 3)**

### Rationale
1. **MVP Speed**: Manual deployment enables 10-minute iteration cycle (code → test → deploy)
2. **Low Complexity**: No YAML config, no CI/CD pipeline setup during rapid prototyping
3. **Learning**: Team learns AWS Lambda fundamentals before abstracting with IaC
4. **Migration Path**: SAM template exists; activate when stabilizing for production

### Current Manual Process
```bash
# Build
cd functions/quotes-calculator
npm run build

# Deploy
cd dist
zip -r quotes-calculator.zip .
aws lambda update-function-code \
  --function-name quotes-calculator-dev \
  --zip-file fileb://quotes-calculator.zip \
  --region eu-west-2
```

### Phase 3 Migration Plan
1. Activate SAM template (already exists in repo)
2. Create GitHub Actions workflow (.github/workflows/deploy-lambdas.yml)
3. Add automated testing (unit + integration) before deployment
4. Implement blue-green deployments with alias routing

### Trade-offs

**Accepted**:
- Manual deployment risk (typos, forgotten env vars)
  - *Mitigation*: Documented deployment runbook; checklist for each deploy
- No automated rollback
  - *Mitigation*: Lambda versions allow manual rollback to previous version
- No CI/CD testing
  - *Mitigation*: Manual testing in dev environment before deployment

**Rejected**:
- SAM's IaC benefits (too slow for MVP iteration; premature optimization)
- GitHub Actions automation (setup time not justified during rapid prototyping)

### Review Date
**Q1 2026** - Migrate to GitHub Actions + SAM before customer auth implementation (Phase 3)

---

## Programming Language: Node.js + TypeScript

### Context
Needed backend language for Lambda functions and frontend framework compatibility.

### Options Evaluated

| Language | Pros | Cons |
|----------|------|------|
| **Node.js + TypeScript** | Same language frontend/backend, fast development, huge npm ecosystem, Lambda native | Single-threaded (mitigated by Lambda concurrency) |
| **Python 3.x** | Great for data processing, simple syntax, popular for Lambda | Different language from frontend, slower cold starts |
| **Go** | Fastest Lambda cold starts, excellent performance, small binary | Different language from frontend, smaller ecosystem, steeper learning curve |
| **Java** | Enterprise-grade, mature ecosystem, type safety | Slowest cold starts (~3s), large binary size, overkill for CRUD APIs |

### Decision: **Node.js 20.x + TypeScript (Strict Mode)**

### Rationale
1. **Full-Stack Consistency**: Same language for Next.js frontend and Lambda backend (shared types, utilities)
2. **Developer Velocity**: No context switching between languages; team expertise in one stack
3. **Cold Start Performance**: Node.js ~500ms vs Python ~800ms vs Java ~3s
4. **npm Ecosystem**: Largest package registry (2M+ packages); libraries for every need
5. **Lambda Native**: First-class AWS support; frequent runtime updates

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Benefits**:
- Catch errors at compile time vs runtime
- IDE autocomplete and refactoring
- Shared types between frontend and backend

### Trade-offs

**Accepted**:
- Single-threaded event loop (not ideal for CPU-intensive tasks)
  - *Mitigation*: Our workload is I/O-bound (API calls, DB queries); event loop handles concurrency well
- TypeScript compilation step (adds build time)
  - *Mitigation*: ~2 seconds per Lambda; negligible vs development speed gains

**Rejected**:
- Python's simplicity (consistency with frontend more valuable)
- Go's cold start performance (500ms vs 200ms not worth different language)

### Review Date
**Ongoing** - Monitor Node.js runtime updates; upgrade to Node.js 22.x when GA

---

## Infrastructure as Code

### Context
Needed to manage AWS resources (Lambda, DynamoDB, API Gateway, S3, Secrets Manager) reproducibly.

### Options Evaluated

| Tool | Pros | Cons |
|------|------|------|
| **AWS SAM (Serverless Application Model)** | AWS-native, extends CloudFormation, local testing, built-in best practices | YAML verbosity, slower iteration vs manual |
| **Terraform** | Multi-cloud, HCL syntax, excellent state management, large community | Third-party tool, less AWS-specific optimizations |
| **AWS CDK** | TypeScript code (not YAML), full programming language, type-safe | Generates CloudFormation (verbosity returns), steeper learning curve |
| **Serverless Framework** | Excellent DX, huge plugin ecosystem, multi-cloud | Third-party dependency, less control over CloudFormation |

### Decision: **AWS SAM (Not Yet Activated - Phase 3)**

**Current State**: Manual AWS Console + CLI
**Roadmap**: Migrate to SAM in Phase 3

### Rationale
1. **AWS Native**: First-party tool; guaranteed compatibility with new AWS services
2. **Local Testing**: SAM CLI enables `sam local start-api` for offline development
3. **Best Practices**: Built-in Lambda optimizations (environment variables, IAM policies)
4. **CloudFormation Integration**: Leverage CloudFormation for complex orchestration
5. **Cost**: Free (unlike Terraform Cloud or Serverless Framework Pro)

### Phase 3 Migration Plan
1. Activate existing template.yaml in repo
2. Define all Lambda functions, DynamoDB tables, API Gateway routes
3. Implement `sam deploy --guided` for automated deployments
4. Add GitHub Actions workflow to deploy on merge to main

### Trade-offs

**Accepted**:
- YAML verbosity (100+ lines for single Lambda with API Gateway integration)
  - *Mitigation*: Template shared resources (IAM roles, environment variables) reduce duplication
- Slower iteration vs manual CLI during MVP
  - *Mitigation*: Only activate SAM when stabilizing for production (Phase 3)

**Rejected**:
- Terraform's multi-cloud (no multi-cloud requirement; AWS commitment accepted)
- CDK's TypeScript (adds complexity vs YAML; prefer declarative over imperative IaC)

### Review Date
**Q1 2026** - Activate SAM before Phase 3 (customer auth and payments)

---

## Lambda Architecture: arm64 (Graviton2)

### Context
AWS Lambda supports two architectures: x86_64 (Intel) and arm64 (AWS Graviton2). Needed to choose architecture for all Lambda functions.

### Options Evaluated

| Architecture | Pros | Cons |
|-------------|------|------|
| **arm64 (Graviton2)** | 20% cost reduction, 15-20% faster cold starts, better performance per watt | Potential npm package compatibility issues |
| **x86_64** | Universal npm package compatibility, industry standard | Higher cost, slower cold starts |

### Decision: **arm64 (AWS Graviton2) for ALL Lambda Functions**

### Rationale
1. **Cost Savings**: 20% reduction on Lambda costs (£5/month → £4/month at MVP; £15/month → £12/month at scale)
2. **Cold Start Performance**: ~600ms vs ~750ms (15-20% faster first invocation)
3. **Better Performance**: Graviton2 optimized for serverless workloads
4. **npm Compatibility**: All our dependencies (aws-sdk, bcryptjs, axios) support arm64
5. **Future-Proof**: AWS investing heavily in Graviton; likely default architecture in future

### Compatibility Testing
Tested all npm dependencies on arm64:
- aws-sdk: Native arm64 support
- bcryptjs: Pure JavaScript (architecture-agnostic)
- axios: Pure JavaScript
- jsonwebtoken: Pure JavaScript

**Result**: Zero compatibility issues

### Trade-offs

**Accepted**:
- Potential future npm package compatibility
  - *Mitigation*: Test new packages on arm64 before adding to production
- Less common than x86_64 (smaller knowledge base)
  - *Mitigation*: AWS documentation excellent; Lambda handles architecture transparently

**Rejected**:
- x86_64's universal compatibility (no incompatible packages identified)

### Review Date
**Ongoing** - Test new npm packages on arm64 before production use

---

## Summary of Key Decisions

| Domain | Decision | Primary Rationale |
|--------|----------|------------------|
| **Frontend** | Next.js 14 (App Router) | SEO, server components, Amplify native |
| **Backend** | AWS Lambda (arm64) | £5/month vs £40/month EC2; auto-scaling; zero ops |
| **Database** | DynamoDB (single-table) | £8/month vs £40/month SQL; ms latency; auto-scale |
| **Auth (Admin)** | Custom JWT + bcryptjs | £0 vs £1/month Cognito; full control; simplicity |
| **Styling** | Tailwind CSS | 3x faster dev; small bundle; mobile-first |
| **Hosting** | AWS Amplify | Free tier; AWS integration; auto-deploy |
| **Maps** | Google Maps | Best UK data; comprehensive APIs; reliability |
| **Deployment** | Manual CLI → SAM | Fast iteration MVP; migrate to IaC Phase 3 |
| **Language** | Node.js 20 + TypeScript | Full-stack consistency; fast cold starts; huge ecosystem |
| **IaC** | AWS SAM (Phase 3) | AWS native; local testing; CloudFormation integration |
| **Architecture** | arm64 (Graviton2) | 20% cost savings; faster cold starts; better performance |

---

## Decision Review Process

All architecture decisions reviewed on:
1. **Quarterly basis** - Evaluate if decision still optimal at current scale
2. **Before major phases** - Re-validate choices before Phase 3, Phase 4
3. **When costs exceed budget** - Identify cost optimization opportunities
4. **When performance SLAs missed** - Identify bottlenecks and alternatives

**Responsible**: CTO + Tech Lead
**Documentation**: Update this document with new rationale or decision reversals

---

**END OF ARCHITECTURE DECISIONS**

*For platform overview, see [CTO_PLATFORM_OVERVIEW.md](CTO_PLATFORM_OVERVIEW.md)*
*For technical reference, see [CTO_TECHNICAL_REFERENCE.md](CTO_TECHNICAL_REFERENCE.md)*
*For development guidelines, see [CTO_DEVELOPMENT_GUIDE.md](CTO_DEVELOPMENT_GUIDE.md)*
