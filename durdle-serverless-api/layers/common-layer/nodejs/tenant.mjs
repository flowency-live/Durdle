/**
 * Tenant utilities for multi-tenant data isolation
 * Phase 0.5: Hardcoded tenant until API Gateway authorizer is built
 *
 * When Client #2 arrives, swap getTenantId() to read from:
 *   event.requestContext.authorizer.tenantId
 */

// Hardcoded tenant ID until authorizer provides it from API key
// Format: TENANT#{numeric_id} - opaque, no company names for security
export const CURRENT_TENANT = 'TENANT#001';

// S3 uses hyphens instead of hash symbols (hash not valid in S3 keys)
export const CURRENT_TENANT_S3 = 'TENANT-001';

/**
 * Get tenant ID from event
 * Currently returns hardcoded tenant (Phase 0.5)
 *
 * @param {object} event - Lambda event object
 * @returns {string} Tenant ID (e.g., 'TENANT#001')
 */
export function getTenantId(event) {
  // Phase 1: Will read from event.requestContext.authorizer.tenantId
  // Phase 0.5: Return hardcoded tenant
  return CURRENT_TENANT;
}

/**
 * Get tenant ID for S3 operations
 *
 * @param {object} event - Lambda event object
 * @returns {string} S3-safe tenant ID (e.g., 'TENANT-001')
 */
export function getTenantIdS3(event) {
  return CURRENT_TENANT_S3;
}

/**
 * Build tenant-prefixed partition key
 *
 * @param {string} tenantId - Tenant ID (e.g., 'TENANT#001')
 * @param {string} entityType - Entity type (e.g., 'QUOTE', 'VEHICLE', 'BOOKING')
 * @param {string} entityId - Entity ID
 * @returns {string} Prefixed PK (e.g., 'TENANT#001#QUOTE#abc123')
 */
export function buildTenantPK(tenantId, entityType, entityId) {
  return `${tenantId}#${entityType}#${entityId}`;
}

/**
 * Build tenant-prefixed S3 key
 *
 * @param {string} tenantS3Id - S3-safe tenant ID (e.g., 'TENANT-001')
 * @param {string} folder - Folder name (e.g., 'vehicles', 'documents')
 * @param {string} filename - File name (e.g., 'uuid.jpg')
 * @returns {string} Prefixed key (e.g., 'TENANT-001/vehicles/uuid.jpg')
 */
export function buildTenantS3Key(tenantS3Id, folder, filename) {
  return `${tenantS3Id}/${folder}/${filename}`;
}

/**
 * Extract entity ID from partition key
 * Works with both old (ENTITY#id) and new (TENANT#xxx#ENTITY#id) formats
 *
 * @param {string} pk - Partition key
 * @param {string} entityType - Entity type to extract (e.g., 'QUOTE')
 * @returns {string} Entity ID
 * @throws {Error} If PK format is invalid
 */
export function extractEntityId(pk, entityType) {
  // New format: TENANT#001#QUOTE#abc123
  const tenantPrefixPattern = new RegExp(`^TENANT#\\d+#${entityType}#(.+)$`);
  const tenantMatch = pk.match(tenantPrefixPattern);
  if (tenantMatch) {
    return tenantMatch[1];
  }

  // Old format: QUOTE#abc123 (backward compatibility)
  const oldPattern = new RegExp(`^${entityType}#(.+)$`);
  const oldMatch = pk.match(oldPattern);
  if (oldMatch) {
    return oldMatch[1];
  }

  throw new Error(`Invalid PK format for ${entityType}: ${pk}`);
}

/**
 * Check if a partition key is tenant-prefixed
 *
 * @param {string} pk - Partition key to check
 * @returns {boolean} True if key has tenant prefix
 */
export function isTenantPrefixed(pk) {
  return pk.startsWith('TENANT#');
}

/**
 * Validate tenant access to a resource
 * Throws error if tenant mismatch (cross-tenant access attempt)
 *
 * @param {string} requestTenantId - Tenant making the request
 * @param {string} resourceTenantId - Tenant owning the resource (from DB record)
 * @throws {Error} If cross-tenant access attempted
 */
export function validateTenantAccess(requestTenantId, resourceTenantId) {
  // Allow access if resource has no tenant (legacy data)
  if (!resourceTenantId) {
    return;
  }

  if (requestTenantId !== resourceTenantId) {
    throw new Error('FORBIDDEN: Cross-tenant access denied');
  }
}

/**
 * Log tenant context for audit trail
 * Use this at the start of each Lambda handler
 *
 * @param {object} logger - Pino logger instance
 * @param {string} tenantId - Current tenant ID
 * @param {string} operation - Operation being performed (e.g., 'quote_calculation')
 */
export function logTenantContext(logger, tenantId, operation) {
  logger.info({
    event: 'tenant_context',
    tenantId,
    operation,
  }, `Tenant operation: ${operation}`);
}

/**
 * Build filter expression for queries that should include both old and new format data
 * Used during transition period when both formats exist in database
 *
 * @param {string} tenantId - Current tenant ID
 * @param {string} entityType - Entity type (e.g., 'VEHICLE')
 * @returns {object} Filter configuration with expression and attribute values
 */
export function buildDualFormatFilter(tenantId, entityType) {
  return {
    FilterExpression: '(begins_with(PK, :newPrefix) OR begins_with(PK, :oldPrefix)) AND (attribute_not_exists(tenantId) OR tenantId = :tenantId)',
    ExpressionAttributeValues: {
      ':newPrefix': `${tenantId}#${entityType}#`,
      ':oldPrefix': `${entityType}#`,
      ':tenantId': tenantId,
    }
  };
}
