# ⚠️ READ THIS BEFORE TOUCHING ANY LAMBDA FUNCTION ⚠️

**Last Updated**: December 6, 2025
**Mandatory Reading**: YES - Do NOT deploy without reading this

---

## Critical Rule: Every Lambda Has a Structure

Each Lambda function directory has a `STRUCTURE.md` file that lists:
- **ALL files that MUST be included in deployment**
- **ALL files that MUST be excluded from deployment**
- **Dependencies (npm packages) required**

**BEFORE you deploy ANY Lambda, you MUST:**
1. Read the Lambda's `STRUCTURE.md` file
2. Verify all required files are present
3. Package ONLY the files listed in "Include in Deployment"
4. Deploy using commands in `STRUCTURE.md`

---

## Current Lambda Structure Status

| Lambda Function | Required Files | Has STRUCTURE.md |
|----------------|----------------|------------------|
| quotes-calculator | 4 .mjs files + deps | ✅ YES |
| admin-auth | TBD | ⏭️ TODO |
| pricing-manager | TBD | ⏭️ TODO |
| vehicle-manager | TBD | ⏭️ TODO |
| fixed-routes-manager | TBD | ⏭️ TODO |
| locations-lookup | TBD | ⏭️ TODO |
| uploads-presigned | TBD | ⏭️ TODO |
| feedback-manager | TBD | ⏭️ TODO |
| document-comments | TBD | ⏭️ TODO |

---

## Common Deployment Mistakes (AVOID THESE)

### ❌ MISTAKE 1: Missing Required Files
**Problem**: Deployed quotes-calculator without `logger.mjs`
**Result**: Lambda crashes with "Cannot find module './logger.mjs'"
**Fix**: Always check STRUCTURE.md for required files

### ❌ MISTAKE 2: Including Test Files
**Problem**: Included `tests/`, `coverage/`, `jest.config.mjs` in deployment ZIP
**Result**: 14MB deployment package (should be <1MB after Lambda Layers)
**Fix**: Exclude files listed in "Exclude from Deployment"

### ❌ MISTAKE 3: Missing node_modules
**Problem**: Deployed without `node_modules/`
**Result**: Lambda crashes with "Cannot find module 'pino'"
**Fix**: Always run `npm install` before packaging

---

## Standard Deployment Process

### Step 1: Navigate to Function Directory
```bash
cd durdle-serverless-api/functions/{function-name}
```

### Step 2: Read STRUCTURE.md
```bash
cat STRUCTURE.md
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Create Deployment Package
```bash
# See STRUCTURE.md for exact files to include
powershell -Command "Compress-Archive -Path file1.mjs,file2.mjs,package.json,package-lock.json,node_modules -DestinationPath function.zip -Force"
```

### Step 5: Deploy to AWS
```bash
aws lambda update-function-code \
  --function-name {function-name}-dev \
  --zip-file fileb://function.zip \
  --region eu-west-2
```

### Step 6: Verify Deployment
```bash
# Test the Lambda
aws lambda invoke \
  --function-name {function-name}-dev \
  --region eu-west-2 \
  --payload file://test-payload.json \
  --cli-binary-format raw-in-base64-out \
  response.json

# Check logs for errors
MSYS_NO_PATHCONV=1 aws logs tail "/aws/lambda/{function-name}-dev" \
  --region eu-west-2 \
  --since 5m \
  --format short
```

---

## File Naming Conventions

**Lambda Handler Files**: Always `index.mjs`
**Validation Files**: Always `validation.mjs` (if Zod validation exists)
**Logger Files**: Always `logger.mjs` (if structured logging exists)
**Test Files**: Always in `tests/` directory (NEVER deploy these)
**Config Files**: `package.json`, `package-lock.json` (ALWAYS deploy these)

---

## Lambda Layers (Coming Soon)

Once Lambda Layers are deployed:
- `logger.mjs` will move to a shared layer
- Pino dependency will be in the layer
- Deployment packages will shrink from 14MB to <1MB
- This README will be updated with layer usage instructions

---

## When in Doubt

1. **Read the Lambda's STRUCTURE.md file**
2. **Check C:\VSProjects\_Websites\Durdle\.documentation\CTO\LAMBDA_DEPLOYMENT_GUIDE.md**
3. **Ask CTO before deploying if uncertain**

---

**DO NOT SKIP READING STRUCTURE.md FILES**

Skipping structure documentation causes production crashes.
Every crash costs debugging time and impacts customer trust.

---

**Document Owner**: CTO
**Enforcement**: Mandatory before deployment
