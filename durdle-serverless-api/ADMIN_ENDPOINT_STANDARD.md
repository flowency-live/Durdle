# Admin Endpoint Standard

**Last Updated**: December 8, 2025
**Owner**: CTO
**Purpose**: Mandatory standards for ALL admin Lambda endpoints

---

## CORS Configuration (MANDATORY)

All admin endpoints (`/admin/*`) MUST follow the exact CORS pattern from `admin-auth`. This is non-negotiable.

### Why This Matters

The frontend uses `credentials: 'include'` for all admin API calls. When credentials are included:
- `Access-Control-Allow-Origin` **CANNOT be `*`** (wildcard)
- `Access-Control-Allow-Origin` **MUST be the exact requesting origin**
- `Access-Control-Allow-Credentials` **MUST be `'true'`**

**If you use `*` with credentials, the browser will block the request with a CORS error.**

---

## Required CORS Implementation

Copy this EXACT code into every admin Lambda:

```javascript
const getAllowedOrigins = () => [
  'http://localhost:3000',
  'https://durdle.flowency.build',
  'https://durdle.co.uk'
];

const getHeaders = (origin) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };
};
```

### Usage in Handler

```javascript
export const handler = async (event, context) => {
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getHeaders(origin);

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // ... rest of handler
  // Always use 'headers' in responses
};
```

---

## API Gateway Configuration (CRITICAL)

Lambda CORS headers are NOT enough. API Gateway also needs configuration:

### For Each Admin Route in API Gateway:

1. **Enable CORS** on the route
2. **Configure OPTIONS response** with these headers:
   - `Access-Control-Allow-Origin`: Use `$request.header.origin` or specific origins
   - `Access-Control-Allow-Headers`: `Content-Type,Authorization`
   - `Access-Control-Allow-Methods`: `GET,POST,PUT,DELETE,OPTIONS`
   - `Access-Control-Allow-Credentials`: `true`

### AWS Console Steps:
1. Go to API Gateway > qry0k6pmd0
2. Select the admin route (e.g., `/admin/quotes`)
3. Click "CORS" in left sidebar
4. Configure as above
5. **Deploy API** after changes

---

## Pre-Deployment Checklist

Before marking ANY admin endpoint deployment as complete:

- [ ] Lambda has CORS code copied EXACTLY from admin-auth
- [ ] `getAllowedOrigins()` includes all three origins
- [ ] `getHeaders(origin)` returns specific origin, NOT `*`
- [ ] `Access-Control-Allow-Credentials: 'true'` is present
- [ ] OPTIONS handler returns 200 with headers
- [ ] API Gateway route is configured with CORS
- [ ] API Gateway is deployed after changes
- [ ] Tested from `https://durdle.flowency.build` (not just localhost)
- [ ] Verified no CORS errors in browser console

---

## Reference Implementation

The canonical reference is `admin-auth/index.mjs`. When in doubt, copy from there.

```
durdle-serverless-api/functions/admin-auth/index.mjs
  - Lines 18-22: getAllowedOrigins()
  - Lines 24-35: getHeaders()
  - Lines 49-51: OPTIONS handler
```

---

## Common Mistakes (DO NOT DO THESE)

### Mistake 1: Wildcard Origin
```javascript
// WRONG - Will cause CORS error with credentials
'Access-Control-Allow-Origin': '*'
```

### Mistake 2: Missing Credentials Header
```javascript
// WRONG - Missing credentials header
return {
  'Access-Control-Allow-Origin': origin,
  // No 'Access-Control-Allow-Credentials': 'true'
};
```

### Mistake 3: Conditional Headers Based on HTTP Method
```javascript
// WRONG - Don't vary headers based on GET vs POST
if (httpMethod === 'GET') {
  return { 'Access-Control-Allow-Origin': '*' };
}
```

### Mistake 4: Forgetting API Gateway Configuration
Lambda CORS is not enough. API Gateway preflight responses must also be configured.

---

## Quality Gate

**No admin endpoint deployment is complete until:**
1. Backend developer has tested from production URL
2. No CORS errors appear in browser console
3. CTO has verified API Gateway configuration

---

**Document Owner**: CTO
**Enforcement**: Mandatory for all admin endpoints
