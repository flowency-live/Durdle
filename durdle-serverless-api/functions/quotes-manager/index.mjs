import { createLogger } from '/opt/nodejs/logger.mjs';
import { queryQuotes, getQuoteById, getAllQuotesForExport } from './queries.mjs';
import { generateCSV, generateCSVFilename } from './csv-export.mjs';
import {
  parseQueryParams,
  parsePathParams,
  listQuotesSchema,
  quoteIdSchema,
  exportQuotesSchema,
  ValidationError,
} from './validation.mjs';

export const handler = async (event, context) => {
  const logger = createLogger(event, context);

  logger.info(
    {
      event: 'lambda_invocation',
      httpMethod: event.httpMethod,
      path: event.path,
      resource: event.resource,
    },
    'Quotes Manager Lambda invoked'
  );

  try {
    // Verify admin authentication
    // In API Gateway, this Lambda should be protected by Cognito Authorizer
    // The JWT token is validated before reaching here
    // event.requestContext.authorizer contains decoded JWT claims

    if (!event.requestContext?.authorizer) {
      logger.warn({ event: 'unauthorized_access' }, 'Unauthorized access attempt');
      return createErrorResponse(401, 'Unauthorized', logger);
    }

    // Route to appropriate handler based on path and method
    const { httpMethod, path, resource } = event;

    // GET /admin/quotes - List quotes with filters
    if (httpMethod === 'GET' && resource === '/admin/quotes') {
      return await handleListQuotes(event, logger);
    }

    // GET /admin/quotes/{quoteId} - Get single quote details
    if (httpMethod === 'GET' && resource === '/admin/quotes/{quoteId}') {
      return await handleGetQuoteDetails(event, logger);
    }

    // GET /admin/quotes/export - Export quotes to CSV
    if (httpMethod === 'GET' && resource === '/admin/quotes/export') {
      return await handleExportQuotes(event, logger);
    }

    // Route not found
    logger.warn({ event: 'route_not_found', httpMethod, path }, 'Route not found');
    return createErrorResponse(404, 'Route not found', logger);
  } catch (error) {
    logger.error(
      {
        event: 'lambda_error',
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
      },
      'Lambda execution error'
    );

    // Handle validation errors
    if (error instanceof ValidationError) {
      return createErrorResponse(400, error.message, logger, { errors: error.errors });
    }

    // Handle other errors
    return createErrorResponse(500, 'Internal server error', logger);
  }
};

// Handle list quotes request
async function handleListQuotes(event, logger) {
  logger.info({ event: 'list_quotes_request' }, 'Handling list quotes request');

  // Parse and validate query parameters
  const filters = parseQueryParams(event.queryStringParameters, listQuotesSchema);

  // Set default date range if not provided (last 30 days)
  if (!filters.dateFrom) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filters.dateFrom = thirtyDaysAgo.toISOString();
  }

  if (!filters.dateTo) {
    filters.dateTo = new Date().toISOString();
  }

  logger.info(
    {
      event: 'list_quotes_filters',
      filters: {
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        hasSearch: !!filters.search,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        limit: filters.limit,
        hasCursor: !!filters.cursor,
      },
    },
    'Query filters applied'
  );

  // Query quotes from DynamoDB
  const result = await queryQuotes(filters, logger);

  logger.info(
    {
      event: 'list_quotes_success',
      quoteCount: result.quotes.length,
      hasMoreResults: !!result.pagination.cursor,
    },
    'List quotes request successful'
  );

  return createSuccessResponse(result, logger);
}

// Handle get quote details request
async function handleGetQuoteDetails(event, logger) {
  logger.info({ event: 'quote_details_request' }, 'Handling get quote details request');

  // Parse and validate path parameters
  const { quoteId } = parsePathParams(event.pathParameters, quoteIdSchema);

  logger.info({ event: 'quote_details_lookup', quoteId }, 'Looking up quote');

  // Fetch quote from DynamoDB
  const quote = await getQuoteById(quoteId, logger);

  if (!quote) {
    logger.warn({ event: 'quote_not_found', quoteId }, 'Quote not found');
    return createErrorResponse(404, 'Quote not found', logger);
  }

  logger.info({ event: 'quote_details_success', quoteId }, 'Quote details retrieved successfully');

  return createSuccessResponse(quote, logger);
}

// Handle export quotes to CSV request
async function handleExportQuotes(event, logger) {
  logger.info({ event: 'export_quotes_request' }, 'Handling export quotes request');

  // Parse and validate query parameters
  const filters = parseQueryParams(event.queryStringParameters, exportQuotesSchema);

  // Set default date range if not provided (last 30 days)
  if (!filters.dateFrom) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    filters.dateFrom = thirtyDaysAgo.toISOString();
  }

  if (!filters.dateTo) {
    filters.dateTo = new Date().toISOString();
  }

  logger.info(
    {
      event: 'export_quotes_filters',
      filters: {
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        priceMin: filters.priceMin,
        priceMax: filters.priceMax,
        hasSearch: !!filters.search,
      },
    },
    'Export filters applied'
  );

  // Get all quotes matching filters (no pagination)
  const quotes = await getAllQuotesForExport(filters, logger);

  logger.info(
    {
      event: 'export_quotes_data_fetched',
      quoteCount: quotes.length,
    },
    'Export data fetched'
  );

  // Generate CSV
  const csv = generateCSV(quotes);
  const filename = generateCSVFilename();

  logger.info(
    {
      event: 'export_quotes_success',
      quoteCount: quotes.length,
      filename,
      csvSize: csv.length,
    },
    'CSV export generated successfully'
  );

  // Return CSV file
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: csv,
  };
}

// Create success response
function createSuccessResponse(data, logger) {
  logger.info({ event: 'response_success' }, 'Returning success response');

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(data),
  };
}

// Create error response
function createErrorResponse(statusCode, message, logger, additionalData = {}) {
  logger.error(
    {
      event: 'response_error',
      statusCode,
      errorMessage: message,
      ...additionalData,
    },
    'Returning error response'
  );

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      error: message,
      ...additionalData,
    }),
  };
}
