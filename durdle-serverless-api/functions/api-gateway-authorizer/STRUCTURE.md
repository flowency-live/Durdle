# API Gateway Authorizer - Deployment Structure

**Last Updated**: December 8, 2025
**Function Name**: `durdle-api-gateway-authorizer-dev`
**Runtime**: Node.js 20.x (arm64)
**Purpose**: JWT validation for admin API endpoints

---

## Function Overview

This Lambda authorizer validates JWT tokens for all `/admin/*` API Gateway routes (except `/admin/auth/login`).

**Authentication Flow**:
1. Request hits API Gateway with Authorization header
2. API Gateway invokes this authorizer
3. Authorizer validates JWT against Secrets Manager secret
4. Returns IAM Allow/Deny policy
5. If allowed, request proceeds to target Lambda

---

## Lambda Layer

**NOT REQUIRED** - This authorizer uses console.log for simplicity.
The structured logging layer is optional but not necessary for an authorizer.

---

## Files to Include in Deployment ZIP

```
index.mjs
package.json
node_modules/
```

---

## Files to EXCLUDE

```
STRUCTURE.md
*.zip
.git/
```

---

## Deployment Commands

### 1. Install Dependencies

```bash
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\api-gateway-authorizer"
npm install
```

### 2. Create Deployment ZIP

```powershell
cd "C:\VSProjects\_Websites\Durdle\durdle-serverless-api\functions\api-gateway-authorizer"
powershell -Command "Compress-Archive -Path index.mjs,package.json,node_modules -DestinationPath function.zip -Force"
```

**Expected ZIP size**: ~2-3 MB (jsonwebtoken + AWS SDK)

### 3. Create Lambda Function (First Time Only)

```bash
aws lambda create-function \
  --function-name durdle-api-gateway-authorizer-dev \
  --runtime nodejs20.x \
  --architectures arm64 \
  --handler index.handler \
  --role arn:aws:iam::771551874768:role/durdle-lambda-execution-role-dev \
  --zip-file fileb://function.zip \
  --timeout 10 \
  --memory-size 128 \
  --region eu-west-2
```

### 4. Update Lambda Function (Subsequent Deployments)

```bash
aws lambda update-function-code \
  --function-name durdle-api-gateway-authorizer-dev \
  --zip-file fileb://function.zip \
  --region eu-west-2
```

---

## Environment Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| JWT_SECRET_NAME | durdle/jwt-secret | Secrets Manager secret name |

Set via AWS Console or CLI:
```bash
aws lambda update-function-configuration \
  --function-name durdle-api-gateway-authorizer-dev \
  --environment "Variables={JWT_SECRET_NAME=durdle/jwt-secret}" \
  --region eu-west-2
```

---

## API Gateway Configuration

After deploying the Lambda, configure API Gateway:

### 1. Create Authorizer

```bash
aws apigateway create-authorizer \
  --rest-api-id qcfd5p4514 \
  --name durdle-jwt-authorizer \
  --type TOKEN \
  --authorizer-uri "arn:aws:apigateway:eu-west-2:lambda:path/2015-03-31/functions/arn:aws:lambda:eu-west-2:771551874768:function:durdle-api-gateway-authorizer-dev/invocations" \
  --identity-source "method.request.header.Authorization" \
  --authorizer-result-ttl-in-seconds 300 \
  --region eu-west-2
```

### 2. Grant API Gateway Permission to Invoke Lambda

```bash
aws lambda add-permission \
  --function-name durdle-api-gateway-authorizer-dev \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:eu-west-2:771551874768:qcfd5p4514/authorizers/*" \
  --region eu-west-2
```

### 3. Attach Authorizer to Routes

Use the authorizer ID returned from step 1 to update each admin route.

---

## Testing

### Test Authorizer Directly

```bash
aws lambda invoke \
  --function-name durdle-api-gateway-authorizer-dev \
  --region eu-west-2 \
  --payload '{"authorizationToken":"Bearer YOUR_JWT_TOKEN","methodArn":"arn:aws:execute-api:eu-west-2:771551874768:qcfd5p4514/dev/GET/admin/quotes"}' \
  --cli-binary-format raw-in-base64-out \
  response.json

cat response.json
```

### Expected Success Response

```json
{
  "principalId": "james.aspin",
  "policyDocument": {
    "Version": "2012-10-17",
    "Statement": [{
      "Action": "execute-api:Invoke",
      "Effect": "Allow",
      "Resource": "arn:aws:execute-api:eu-west-2:771551874768:qcfd5p4514/dev/*/admin/*"
    }]
  },
  "context": {
    "username": "james.aspin",
    "role": "admin",
    "email": "..."
  }
}
```

---

## Common Errors

### "Unauthorized" (401)

- No token provided
- Token expired
- Invalid token signature

### "User is not authorized" (403)

- Authorizer returned Deny policy
- Resource ARN mismatch

### "Internal server error" (500)

- Secrets Manager access denied
- Lambda execution error

---

**Document Owner**: CTO
**Last Updated**: December 8, 2025
