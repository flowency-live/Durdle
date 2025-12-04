# NOTS Platform - Security & Compliance Checklist

**Version:** 1.0
**Last Updated:** 2025-12-04
**Status:** Draft
**Compliance Standards:** GDPR, PCI DSS, UK Data Protection Act 2018

---

## 1. Overview

This document outlines security and compliance requirements for the NOTS platform. All items must be implemented and verified before production launch.

**Regulatory Requirements:**
- **GDPR:** General Data Protection Regulation (EU/UK)
- **PCI DSS:** Payment Card Industry Data Security Standard (Stripe compliance)
- **UK DPA 2018:** Data Protection Act 2018
- **PHV Regulations:** Private Hire Vehicle licensing (local authority specific)

---

## 2. Authentication & Authorization

### 2.1 User Authentication

- [ ] **AWS Cognito User Pools** configured for all user types
- [ ] **Password Policy:** Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
- [ ] **Password Complexity:** Enforced at Cognito level
- [ ] **Account Lockout:** 5 failed attempts = 15-minute lockout
- [ ] **MFA Enabled:** Required for admin accounts, optional for customers
- [ ] **Session Management:** JWT tokens expire after 1 hour
- [ ] **Refresh Tokens:** 30-day expiry, stored securely
- [ ] **Token Rotation:** New tokens issued on refresh
- [ ] **Logout Functionality:** Invalidates tokens client-side

### 2.2 Authorization & Access Control

- [ ] **Role-Based Access Control (RBAC):** Implemented via Cognito groups
- [ ] **Least Privilege Principle:** Users have minimum required permissions
- [ ] **API Authorization:** All endpoints validate JWT claims
- [ ] **Resource-Level Access:** Customers can only access own bookings
- [ ] **Admin Separation:** Dispatcher vs Admin vs Owner roles
- [ ] **Driver Isolation:** Drivers only see assigned jobs
- [ ] **API Gateway Authorizer:** Cognito authorizer attached to all protected routes

**Roles & Permissions Matrix:**

| Resource | Customer | Driver | Dispatcher | Admin | Owner |
|----------|----------|--------|------------|-------|-------|
| View Own Bookings | ✓ | - | - | - | - |
| Create Booking | ✓ | - | ✓ | ✓ | ✓ |
| View All Bookings | - | - | ✓ | ✓ | ✓ |
| Assign Driver | - | - | ✓ | ✓ | ✓ |
| View All Drivers | - | - | ✓ | ✓ | ✓ |
| Manage Pricing | - | - | - | - | ✓ |
| View Analytics | - | - | - | ✓ | ✓ |
| Manage Compliance | - | ✓ (own) | - | ✓ | ✓ |

---

## 3. Data Protection & Privacy (GDPR)

### 3.1 Data Collection & Processing

- [ ] **Privacy Policy:** Published on website, last updated date visible
- [ ] **Cookie Consent:** Banner shown on first visit, preferences saved
- [ ] **Data Minimization:** Only collect necessary data
- [ ] **Purpose Limitation:** Data used only for stated purposes
- [ ] **Lawful Basis:** Documented for each data processing activity
  - Bookings: Contract (Art. 6(1)(b))
  - Marketing: Consent (Art. 6(1)(a))
  - Compliance docs: Legal obligation (Art. 6(1)(c))

### 3.2 Data Subject Rights

- [ ] **Right to Access:** Customer can request all stored data (Phase 2 automation)
- [ ] **Right to Rectification:** Customer can update personal details
- [ ] **Right to Erasure:** Data deletion workflow implemented (Phase 2)
- [ ] **Right to Portability:** Export data in JSON format (Phase 2)
- [ ] **Right to Object:** Opt-out of marketing communications
- [ ] **Response Time:** 30 days maximum for data subject requests

### 3.3 Data Retention

- [ ] **Bookings:** Retained for 7 years (UK tax law requirement)
- [ ] **Customer Accounts:** Deleted after 3 years of inactivity (with 30-day notice)
- [ ] **Payment Data:** Stripe handles retention (not stored by NOTS)
- [ ] **Compliance Documents:** Retained for 5 years after driver leaves
- [ ] **Logs:** CloudWatch logs retained for 90 days
- [ ] **Backups:** DynamoDB PITR for 35 days

### 3.4 Data Encryption

- [ ] **Encryption at Rest:** All DynamoDB tables use AWS managed keys
- [ ] **Encryption in Transit:** TLS 1.2+ enforced for all API calls
- [ ] **S3 Encryption:** All buckets have default encryption enabled
- [ ] **Secrets Management:** API keys stored in AWS Secrets Manager (not environment variables)
- [ ] **Database Backups:** Encrypted with AWS KMS

### 3.5 Data Breach Response

- [ ] **Breach Detection:** CloudWatch alarms for suspicious activity
- [ ] **Incident Response Plan:** Documented procedure (see Section 9)
- [ ] **Notification Procedure:** 72-hour notification to ICO (UK data authority)
- [ ] **Customer Notification:** Email all affected users within 72 hours
- [ ] **Breach Register:** Log all incidents (even if not reportable)

---

## 4. Payment Security (PCI DSS)

### 4.1 Stripe Integration

- [ ] **No Card Data Stored:** NOTS never handles raw card numbers
- [ ] **Stripe Elements:** Used for card input (iframe isolation)
- [ ] **PCI Compliance:** Achieved via Stripe (NOTS is PCI DSS Level 4 compliant by proxy)
- [ ] **Webhook Signature Verification:** Stripe webhooks validated before processing
- [ ] **HTTPS Only:** All payment pages use HTTPS
- [ ] **Stripe Test Mode:** Enabled for staging, disabled for production

### 4.2 Payment Data Handling

- [ ] **Payment Intent IDs:** Stored in DynamoDB (safe to store)
- [ ] **Customer IDs:** Stripe customer IDs stored for recurring customers (Phase 2)
- [ ] **Refunds:** Processed via Stripe API, not manual
- [ ] **Payment Logs:** No card details logged in CloudWatch

---

## 5. API Security

### 5.1 API Gateway Configuration

- [ ] **AWS WAF Enabled:** Web Application Firewall protects against common attacks
- [ ] **Rate Limiting:** Implemented per user/IP
  - Public endpoints: 100 requests/hour per IP
  - Authenticated endpoints: 1000 requests/hour per user
  - Admin endpoints: 5000 requests/hour
- [ ] **CORS Policy:** Restricted to nots.co.uk domain only
- [ ] **API Keys:** Not used (JWT authentication instead)
- [ ] **Request Validation:** Schema validation enabled on API Gateway
- [ ] **Response Headers:** Security headers configured (see below)

### 5.2 Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' https://js.stripe.com; frame-src https://js.stripe.com
Referrer-Policy: strict-origin-when-cross-origin
```

- [ ] **CSP:** Content Security Policy prevents XSS attacks
- [ ] **HSTS:** HTTP Strict Transport Security enforces HTTPS
- [ ] **X-Frame-Options:** Prevents clickjacking

### 5.3 Input Validation

- [ ] **API Request Validation:** All inputs validated against OpenAPI schema
- [ ] **SQL Injection Protection:** N/A (DynamoDB doesn't use SQL)
- [ ] **NoSQL Injection Protection:** Parameterized queries, no string concatenation
- [ ] **XSS Protection:** All user inputs sanitized before display
- [ ] **File Upload Validation:** File type, size, and content checked
  - Max size: 10MB
  - Allowed types: PDF, JPG, PNG
  - Virus scanning: AWS Macie (Phase 2) or ClamAV

---

## 6. Infrastructure Security

### 6.1 AWS Account Security

- [ ] **Root Account:** MFA enabled, never used for daily operations
- [ ] **IAM Users:** Individual accounts for each team member
- [ ] **IAM Roles:** Used for service-to-service authentication
- [ ] **Least Privilege:** All IAM policies follow minimum required permissions
- [ ] **Access Keys:** Rotated every 90 days
- [ ] **CloudTrail:** Enabled for audit logging of all API calls
- [ ] **Config Rules:** AWS Config monitors compliance with security policies

### 6.2 Lambda Security

- [ ] **Execution Role:** Each Lambda has dedicated IAM role with minimal permissions
- [ ] **Environment Variables:** Sensitive values stored in Secrets Manager, not env vars
- [ ] **VPC Configuration:** Not required (DynamoDB/S3 use public endpoints with IAM auth)
- [ ] **Function Timeout:** Set to minimum required (3-15 seconds)
- [ ] **Concurrency Limits:** Prevents DDoS via Lambda invocation
- [ ] **Dead Letter Queues:** Failed invocations logged to SQS DLQ
- [ ] **X-Ray Tracing:** Enabled for debugging (not sensitive data)

### 6.3 DynamoDB Security

- [ ] **Encryption at Rest:** Enabled (AWS managed keys)
- [ ] **IAM Policies:** Least privilege per Lambda function
- [ ] **VPC Endpoints:** Not required (IAM auth sufficient)
- [ ] **Point-in-Time Recovery:** Enabled for production table
- [ ] **Backup Retention:** 35 days
- [ ] **Fine-Grained Access Control:** Consider for Phase 2 (row-level security)

### 6.4 S3 Security

- [ ] **Bucket Encryption:** Default encryption enabled (AES-256)
- [ ] **Bucket Policy:** Enforce HTTPS only (`aws:SecureTransport = true`)
- [ ] **Block Public Access:** Enabled (all 4 settings)
- [ ] **Presigned URLs:** Used for secure file uploads (1-hour expiry)
- [ ] **Versioning:** Enabled for compliance documents
- [ ] **Access Logging:** S3 access logs sent to separate audit bucket
- [ ] **Object Lock:** Consider for immutable compliance docs (Phase 2)

### 6.5 CloudFront Security

- [ ] **HTTPS Only:** Redirect HTTP to HTTPS
- [ ] **TLS 1.2+:** Minimum TLS version enforced
- [ ] **Custom SSL Certificate:** ACM certificate for nots.co.uk
- [ ] **Origin Access Identity:** S3 bucket only accessible via CloudFront
- [ ] **Geo-Restriction:** Restrict to UK only (if required by business)
- [ ] **WAF Integration:** AWS WAF attached to CloudFront distribution

---

## 7. Application Security

### 7.1 Frontend Security (Next.js)

- [ ] **No Secrets in Client Code:** API keys never exposed in frontend
- [ ] **Environment Variables:** Prefixed with `NEXT_PUBLIC_` for client-side vars only
- [ ] **XSS Prevention:** React escapes all output by default
- [ ] **CSRF Protection:** Not required (stateless JWT auth)
- [ ] **Secure Cookies:** httpOnly, secure, sameSite=strict flags
- [ ] **Subresource Integrity (SRI):** For external scripts (Stripe.js)
- [ ] **Dependency Scanning:** npm audit run before each deployment
- [ ] **HTTPS Enforcement:** All pages use HTTPS

### 7.2 Backend Security (Lambda)

- [ ] **Input Validation:** All inputs validated before processing
- [ ] **Error Handling:** No sensitive data in error messages
- [ ] **Logging:** No PII logged in CloudWatch (mask phone/email)
- [ ] **Dependency Scanning:** npm audit run before deployment
- [ ] **SAST:** Static Application Security Testing (GitHub CodeQL or Snyk)
- [ ] **Secret Rotation:** Secrets Manager auto-rotation for API keys
- [ ] **Code Review:** All PRs reviewed for security issues

### 7.3 Database Security

- [ ] **Parameterized Queries:** All DynamoDB queries use parameters
- [ ] **No Raw User Input:** User input sanitized before storage
- [ ] **Audit Logging:** All write operations logged with user ID and timestamp
- [ ] **Data Masking:** Sensitive fields masked in logs (phone: +4477009***23)

---

## 8. Monitoring & Incident Response

### 8.1 Security Monitoring

- [ ] **CloudWatch Alarms:** Configured for:
  - High error rate (> 5% for 5 minutes)
  - Lambda throttling
  - API Gateway 5xx errors
  - DynamoDB throttles
  - Failed authentication attempts (> 10 in 5 minutes)
- [ ] **AWS GuardDuty:** Enabled for threat detection
- [ ] **VPC Flow Logs:** Not required (no VPC)
- [ ] **CloudTrail Monitoring:** Alert on suspicious API calls
- [ ] **Security Hub:** Aggregate findings from GuardDuty, Config, etc.

### 8.2 Logging & Auditing

- [ ] **Audit Log:** All admin actions logged (who, what, when)
- [ ] **CloudWatch Logs:** Retention 90 days
- [ ] **Access Logs:** API Gateway logs all requests
- [ ] **S3 Access Logs:** Track file access
- [ ] **Log Integrity:** CloudWatch Logs Insights for analysis
- [ ] **No PII in Logs:** Phone numbers and emails masked

**Audit Log Example:**
```json
{
  "timestamp": "2025-12-04T15:00:00Z",
  "userId": "admin_abc123",
  "action": "UPDATE_BOOKING",
  "resourceId": "booking_xyz789",
  "changes": {
    "status": { "from": "confirmed", "to": "assigned" },
    "driverId": { "from": null, "to": "driver_def456" }
  },
  "ipAddress": "203.0.113.42",
  "userAgent": "Mozilla/5.0..."
}
```

### 8.3 Incident Response Plan

**Severity Levels:**
- **P0 (Critical):** Data breach, payment system down, complete outage
- **P1 (High):** Partial outage, security vulnerability discovered
- **P2 (Medium):** Performance degradation, non-critical bug
- **P3 (Low):** Minor issue, feature request

**Response Procedure:**

1. **Detection:** Alert triggered or issue reported
2. **Assessment:** Determine severity and impact
3. **Containment:** Stop the attack/issue from spreading
4. **Eradication:** Remove the root cause
5. **Recovery:** Restore normal operations
6. **Lessons Learned:** Post-incident review within 7 days

**P0 Incident Response (Data Breach):**

1. **Immediate Actions (0-1 hour):**
   - [ ] Identify affected systems and data
   - [ ] Isolate compromised resources (disable API keys, revoke tokens)
   - [ ] Notify technical leadership

2. **Short-Term Actions (1-24 hours):**
   - [ ] Contain breach (block attacker IP, close vulnerability)
   - [ ] Assess number of affected users
   - [ ] Preserve evidence for forensics
   - [ ] Notify business leadership

3. **Regulatory Compliance (24-72 hours):**
   - [ ] Report to ICO (UK) within 72 hours (GDPR requirement)
   - [ ] Notify affected customers via email
   - [ ] Publish incident notice on website (if required)

4. **Long-Term Actions (1-4 weeks):**
   - [ ] Conduct forensic analysis
   - [ ] Implement fixes and patches
   - [ ] Update security policies
   - [ ] Staff security training
   - [ ] Post-incident report

**Emergency Contacts:**
- **Technical Lead:** [phone], [email]
- **Data Protection Officer:** [email]
- **ICO Reporting:** https://ico.org.uk/for-organisations/report-a-breach/

---

## 9. Compliance Checklists

### 9.1 GDPR Compliance Checklist

- [ ] **Data Protection Officer (DPO):** Appointed (if processing > 250 people)
- [ ] **Privacy Policy:** Published and accessible
- [ ] **Cookie Policy:** Published and accessible
- [ ] **Consent Management:** Cookie banner with opt-in/out
- [ ] **Data Processing Agreement (DPA):** Signed with AWS (covered by AWS Customer Agreement)
- [ ] **Data Subject Requests:** Process in place for access/deletion/portability
- [ ] **Data Breach Notification:** 72-hour process documented
- [ ] **Privacy by Design:** Security considered in all development
- [ ] **Data Protection Impact Assessment (DPIA):** Conducted if high-risk processing
- [ ] **International Transfers:** N/A (all data in UK/EU)
- [ ] **Right to Be Forgotten:** Implemented (Phase 2)

### 9.2 PCI DSS Compliance Checklist

- [ ] **SAQ A:** Self-Assessment Questionnaire A completed annually
- [ ] **Stripe Partnership:** Offloads PCI compliance burden
- [ ] **No Card Data Storage:** Confirmed
- [ ] **HTTPS Only:** Enforced on payment pages
- [ ] **Network Segmentation:** Not required (Stripe handles)
- [ ] **Vulnerability Scans:** Quarterly scans (consider HackerOne, Phase 2)
- [ ] **Attestation of Compliance:** Signed annually

**Note:** NOTS qualifies for PCI DSS SAQ A (simplest compliance level) because card data is handled entirely by Stripe.

### 9.3 UK Data Protection Act 2018

- [ ] **Lawful Basis:** Documented for all processing
- [ ] **Transparency:** Clear privacy notices
- [ ] **Data Security:** Appropriate technical measures
- [ ] **Data Minimization:** Only necessary data collected
- [ ] **Accountability:** Records of processing activities maintained
- [ ] **ICO Registration:** Company registered with ICO (£40/year)

---

## 10. Third-Party Security

### 10.1 Vendor Risk Management

**Key Third Parties:**
- **AWS:** ISO 27001, SOC 2, PCI DSS Level 1
- **Stripe:** PCI DSS Level 1, SOC 2
- **Google Maps API:** Google Cloud security standards
- **Twilio (Phase 3):** SOC 2, ISO 27001

- [ ] **Vendor Agreements:** Review security/privacy terms before integration
- [ ] **Data Processing Agreements:** Signed with all processors
- [ ] **Regular Reviews:** Annual vendor security review
- [ ] **Alternatives Identified:** Backup vendors if primary fails

### 10.2 Open Source Dependencies

- [ ] **Dependency Scanning:** npm audit run weekly
- [ ] **Automated Updates:** Dependabot enabled on GitHub
- [ ] **License Compliance:** All dependencies use permissive licenses (MIT, Apache 2.0)
- [ ] **Vulnerability Remediation:** Critical vulnerabilities patched within 7 days

---

## 11. Testing & Validation

### 11.1 Security Testing

- [ ] **Penetration Testing:** Annual pentest by third party (recommended)
- [ ] **Vulnerability Scanning:** Quarterly scans (AWS Inspector or Nessus)
- [ ] **SAST:** Static analysis in CI/CD pipeline (GitHub CodeQL)
- [ ] **DAST:** Dynamic analysis for staging environment (OWASP ZAP)
- [ ] **Dependency Scanning:** npm audit, Snyk, or GitHub Dependabot

### 11.2 Security Training

- [ ] **Developer Training:** Secure coding practices (OWASP Top 10)
- [ ] **Admin Training:** GDPR awareness, phishing prevention
- [ ] **Incident Response Drills:** Quarterly tabletop exercises

---

## 12. Pre-Launch Security Checklist

**Complete this checklist before production deployment:**

### Infrastructure
- [ ] CloudFront HTTPS enforced
- [ ] API Gateway Cognito authorizer enabled
- [ ] DynamoDB encryption at rest enabled
- [ ] S3 bucket public access blocked
- [ ] AWS WAF rules configured
- [ ] CloudTrail logging enabled
- [ ] CloudWatch alarms configured
- [ ] Secrets Manager secrets created
- [ ] IAM roles follow least privilege
- [ ] MFA enabled on all admin accounts

### Application
- [ ] All API endpoints require authentication (except public quotes)
- [ ] Input validation on all user inputs
- [ ] Error messages don't leak sensitive data
- [ ] CORS restricted to nots.co.uk
- [ ] Rate limiting enabled
- [ ] Stripe webhook signature verification
- [ ] Password policy enforced (Cognito)
- [ ] Session timeout configured (1 hour)

### Compliance
- [ ] Privacy policy published
- [ ] Cookie consent banner live
- [ ] ICO registration complete
- [ ] Data retention policy documented
- [ ] Incident response plan documented
- [ ] Data subject request process defined
- [ ] Staff trained on GDPR basics

### Monitoring
- [ ] CloudWatch dashboard created
- [ ] Critical alarms tested
- [ ] GuardDuty enabled
- [ ] Log retention set to 90 days
- [ ] Audit logging implemented for admin actions

### Documentation
- [ ] Security policies documented
- [ ] Disaster recovery plan written
- [ ] Runbooks for common incidents
- [ ] Contact list for security incidents

---

## 13. Ongoing Security Tasks

**Weekly:**
- [ ] Review CloudWatch alarms and logs
- [ ] Check for new security advisories (AWS, npm)

**Monthly:**
- [ ] Run npm audit and update dependencies
- [ ] Review IAM access (remove unused users)
- [ ] Check S3 bucket policies

**Quarterly:**
- [ ] Vulnerability scan
- [ ] Review and test backup restoration
- [ ] Security training refresher

**Annually:**
- [ ] Penetration test
- [ ] PCI DSS SAQ A completion
- [ ] GDPR compliance review
- [ ] Update privacy policy
- [ ] Disaster recovery drill

---

## 14. Security Contacts

**Internal:**
- **Technical Lead:** [Name, Email, Phone]
- **Security Officer:** [Name, Email]
- **Data Protection Officer:** [Name, Email]

**External:**
- **AWS Support:** https://console.aws.amazon.com/support/
- **Stripe Support:** https://support.stripe.com/
- **ICO (Data Protection):** https://ico.org.uk/ | +44 303 123 1113
- **National Cyber Security Centre (NCSC):** https://www.ncsc.gov.uk/

---

## References

- GDPR: https://gdpr.eu/
- ICO Guidance: https://ico.org.uk/for-organisations/
- PCI DSS: https://www.pcisecuritystandards.org/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- AWS Security Best Practices: https://docs.aws.amazon.com/security/
- [TechnicalArchitecture.md](TechnicalArchitecture.md)
- [DeploymentRunbook.md](DeploymentRunbook.md)

---

**Document Owner:** Security Lead / CTO
**Review Cycle:** Quarterly or after security incidents
