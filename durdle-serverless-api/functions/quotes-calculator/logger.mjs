/**
 * Structured logging utility using Pino
 * Provides correlation IDs and consistent log formatting for CloudWatch
 */

import pino from 'pino';

/**
 * Create base Pino logger instance
 * Configured for AWS Lambda CloudWatch environment
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  base: {
    service: 'quotes-calculator',
    environment: process.env.ENVIRONMENT || 'dev',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/**
 * Create child logger with Lambda context
 * @param {object} event - Lambda event object
 * @param {object} context - Lambda context object
 * @returns {object} Child logger with correlation ID
 */
export function createLogger(event, context) {
  return logger.child({
    requestId: context.requestId,
    functionName: context.functionName,
    functionVersion: context.functionVersion,
    awsRequestId: context.awsRequestId,
  });
}

/**
 * Log quote calculation start
 * @param {object} logger - Pino logger instance
 * @param {object} request - Quote request data
 */
export function logQuoteCalculationStart(logger, request) {
  logger.info({
    event: 'quote_calculation_start',
    vehicleType: request.vehicleType,
    hasWaypoints: (request.waypoints?.length || 0) > 0,
    waypointCount: request.waypoints?.length || 0,
    passengers: request.passengers,
  }, 'Starting quote calculation');
}

/**
 * Log quote calculation success
 * @param {object} logger - Pino logger instance
 * @param {object} quote - Generated quote
 * @param {number} durationMs - Calculation duration in milliseconds
 */
export function logQuoteCalculationSuccess(logger, quote, durationMs) {
  logger.info({
    event: 'quote_calculation_success',
    quoteId: quote.quoteId,
    totalPrice: quote.pricing.breakdown.total,
    distanceMiles: parseFloat(quote.journey.distance.miles),
    durationMinutes: quote.journey.duration.minutes,
    isFixedRoute: quote.pricing.isFixedRoute || false,
    calculationTimeMs: durationMs,
  }, 'Quote calculation completed');
}

/**
 * Log quote calculation error
 * @param {object} logger - Pino logger instance
 * @param {Error} error - Error object
 * @param {object} request - Quote request data
 */
export function logQuoteCalculationError(logger, error, request) {
  logger.error({
    event: 'quote_calculation_error',
    errorMessage: error.message,
    errorStack: error.stack,
    vehicleType: request?.vehicleType,
    hasWaypoints: (request?.waypoints?.length || 0) > 0,
  }, 'Quote calculation failed');
}

/**
 * Log external API call (Google Maps)
 * @param {object} logger - Pino logger instance
 * @param {string} apiType - Type of API call (distance_matrix, directions)
 * @param {number} durationMs - API call duration
 */
export function logExternalApiCall(logger, apiType, durationMs) {
  logger.info({
    event: 'external_api_call',
    apiType,
    durationMs,
  }, `Google Maps ${apiType} API called`);
}

/**
 * Log database operation
 * @param {object} logger - Pino logger instance
 * @param {string} operation - Operation type (query, put, get, scan)
 * @param {string} tableName - DynamoDB table name
 * @param {number} durationMs - Operation duration
 */
export function logDatabaseOperation(logger, operation, tableName, durationMs) {
  logger.info({
    event: 'database_operation',
    operation,
    tableName,
    durationMs,
  }, `DynamoDB ${operation} on ${tableName}`);
}

/**
 * Log validation error
 * @param {object} logger - Pino logger instance
 * @param {object} validationError - Zod validation error
 */
export function logValidationError(logger, validationError) {
  logger.warn({
    event: 'validation_error',
    errorCode: validationError.code,
    errorMessage: validationError.message,
    errorDetails: validationError.details,
  }, 'Request validation failed');
}

/**
 * Log cache hit/miss
 * @param {object} logger - Pino logger instance
 * @param {string} cacheKey - Cache key
 * @param {boolean} hit - Whether cache was hit
 */
export function logCacheAccess(logger, cacheKey, hit) {
  logger.debug({
    event: 'cache_access',
    cacheKey,
    hit,
  }, `Cache ${hit ? 'hit' : 'miss'}: ${cacheKey}`);
}

export default logger;
