# Durdle Platform - Claude Code Memory

This file is automatically loaded for ALL Durdle platform sessions.

## Project Overview

**Durdle** is a white-label transfer booking platform for transportation companies.
- **Current Client**: Dorset Transfer Company (DorsetTC)
- **Timeline**: 6 months to prove business case before scaling to additional clients
- **Architecture**: Next.js 14 frontend + AWS Lambda serverless backend

---

## Backend Development - CRITICAL RULES

**⚠️ BEFORE TOUCHING ANY LAMBDA FUNCTION, READ THIS:**

@C:\VSProjects\_Websites\Durdle\durdle-serverless-api\BACKEND_TEAM_START_HERE.md

**Key Rules**:
1. **NEVER deploy without reading STRUCTURE.md** for that specific Lambda
2. **Lambda Layer `durdle-common-layer:2` is REQUIRED** for functions that import from `/opt/nodejs/`
3. **DO NOT include logger.mjs in deployment ZIPs** (it's in the Lambda Layer)
4. **Follow deployment commands EXACTLY** as written in STRUCTURE.md

---

## CTO Documentation Reference

For CTO-level tracking and platform status:
- Platform Status: `C:\VSProjects\_Websites\Durdle\.documentation\CTO\CODE_AUDIT_AND_REMEDIATION.md`
- Lambda Deployment Guide: `C:\VSProjects\_Websites\Durdle\.documentation\CTO\LAMBDA_DEPLOYMENT_GUIDE.md`
- Multi-Tenancy Architecture: `C:\VSProjects\_Websites\Durdle\.documentation\CTO\MULTI_TENANT_ARCHITECTURE.md`

---

## Current Platform State (Dec 6, 2025)

### Backend
- **9 Lambda Functions** (Node.js 20.x on arm64)
- **Lambda Layer v2**: `durdle-common-layer:2` (logger.mjs + Pino)
- **Structured Logging**: Deployed to quotes-calculator, admin-auth
- **X-Ray Tracing**: Active on all functions
- **Deployment**: Manual via AWS CLI (no auto-deploy)

### Frontend
- **Next.js 14** with App Router
- **TypeScript** strict mode
- **API Config**: Centralized in `lib/config/api.ts`

### Infrastructure
- **Region**: eu-west-2 (London)
- **API Gateway**: qry0k6pmd0
- **DynamoDB**: durdle-*-dev tables
- **Manual Deployments**: SAM/CloudFormation templates exist but NOT used

---

## Development Philosophy (Pre-Launch)

**Build what matters NOW, defer what matters LATER:**
- ✅ **Do Now**: Foundation (Lambda Layers, logging, critical tests, security)
- 🚫 **Skip Until Pre-Launch**: Dashboards, alarms, 100% test coverage

**Rationale**: 6-month validation period with DorsetTC. Focus on customer validation, not operational excellence for scale we don't have yet.

---

## Code Style & Best Practices

### General
- **NO EMOJIS** in code, console.log, or git commits
- **Exception**: Documentation .md files may use emojis for visual organization
- **Git Commits**: One line only, clear and concise (e.g., "Fix venue search to handle empty results")

### Backend Lambda Functions
- **One Lambda = One Responsibility** (SACRED PRINCIPLE)
- **Structured Logging**: Use Pino logger from Lambda Layer
- **Input Validation**: Zod schemas for all request payloads
- **Error Handling**: Fail fast, structured error responses

### Deployment
- **Read STRUCTURE.md first** for every Lambda
- **Verify layer attachment** before deploying
- **Test in CloudWatch logs** after deployment
- **Never deploy to production** without CTO approval

---

## AWS Resources Quick Reference

| Resource | Value |
|----------|-------|
| Region | eu-west-2 |
| API Gateway | qry0k6pmd0 (api endpoint) |
| Lambda Layer | durdle-common-layer:2 |
| Lambda Role | durdle-lambda-execution-role-dev |
| DynamoDB Tables | durdle-*-dev |

---

## Common Commands

### Lambda Deployment
```bash
# 1. Read STRUCTURE.md for the Lambda
cd durdle-serverless-api/functions/[lambda-name]
cat STRUCTURE.md

# 2. Follow commands EXACTLY from STRUCTURE.md
```

### Check Lambda Logs
```bash
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/[lambda-name]-dev" --region eu-west-2 --since 5m --format short
```

### Verify Lambda Layer
```bash
aws lambda get-function-configuration --function-name [lambda-name]-dev --region eu-west-2 --query 'Layers[*].Arn'
```

---

## Multi-Tenancy (Future)

- **Frontend**: One Next.js app per client (NOT multi-tenant)
- **Backend**: Single multi-tenant API (tenant isolation via DynamoDB PK prefixes)
- **Timeline**: Client #2 onboarding in 6-8 months (if DorsetTC validation succeeds)

---

**When in doubt, check [BACKEND_TEAM_START_HERE.md](../durdle-serverless-api/BACKEND_TEAM_START_HERE.md) first.**
