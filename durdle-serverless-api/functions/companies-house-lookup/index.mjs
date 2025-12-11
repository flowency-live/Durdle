/**
 * Companies House Lookup Lambda
 *
 * Proxies search requests to the Companies House Public Data API.
 * Used by admin portal for company name autocomplete when creating corporate accounts.
 *
 * Rate Limit: Companies House API allows 600 requests per 5 minutes (2/sec)
 */

import { createLogger } from '/opt/nodejs/logger.mjs';

// Companies House API configuration
const COMPANIES_HOUSE_API_URL = 'https://api.company-information.service.gov.uk';
const COMPANIES_HOUSE_API_KEY = process.env.COMPANIES_HOUSE_API_KEY;

// CORS configuration - admin portal only
const getAllowedOrigins = () => [
  'http://localhost:3000',
  'https://durdle.flowency.build',
  'https://durdle.co.uk'
];

function getCorsHeaders(origin) {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json'
  };
}

function response(statusCode, body, origin) {
  return {
    statusCode,
    headers: getCorsHeaders(origin),
    body: JSON.stringify(body)
  };
}

/**
 * Search companies by name
 */
async function searchCompanies(query, logger, itemsPerPage = 10) {
  if (!COMPANIES_HOUSE_API_KEY) {
    throw new Error('COMPANIES_HOUSE_API_KEY not configured');
  }

  const searchUrl = `${COMPANIES_HOUSE_API_URL}/search/companies?q=${encodeURIComponent(query)}&items_per_page=${itemsPerPage}`;

  logger.info({ searchUrl: searchUrl.replace(COMPANIES_HOUSE_API_KEY, '***'), query }, 'Searching Companies House');

  const res = await fetch(searchUrl, {
    headers: {
      'Authorization': `Basic ${Buffer.from(COMPANIES_HOUSE_API_KEY + ':').toString('base64')}`
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    logger.error({ status: res.status, error: errorText }, 'Companies House API error');
    throw new Error(`Companies House API returned ${res.status}`);
  }

  const data = await res.json();

  // Transform the response to only include fields we need
  const companies = (data.items || []).map(company => ({
    companyNumber: company.company_number,
    companyName: company.title,
    companyStatus: company.company_status,
    companyType: company.company_type,
    dateOfCreation: company.date_of_creation,
    address: company.address ? {
      line1: [company.address.premises, company.address.address_line_1].filter(Boolean).join(' '),
      line2: company.address.address_line_2 || '',
      city: company.address.locality || '',
      region: company.address.region || '',
      postcode: company.address.postal_code || '',
      country: company.address.country || 'United Kingdom'
    } : null
  }));

  return {
    totalResults: data.total_results || 0,
    itemsPerPage: data.items_per_page || itemsPerPage,
    companies
  };
}

/**
 * Get company by number
 */
async function getCompany(companyNumber, logger) {
  if (!COMPANIES_HOUSE_API_KEY) {
    throw new Error('COMPANIES_HOUSE_API_KEY not configured');
  }

  const url = `${COMPANIES_HOUSE_API_URL}/company/${encodeURIComponent(companyNumber)}`;

  logger.info({ companyNumber }, 'Fetching company details');

  const res = await fetch(url, {
    headers: {
      'Authorization': `Basic ${Buffer.from(COMPANIES_HOUSE_API_KEY + ':').toString('base64')}`
    }
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const errorText = await res.text();
    logger.error({ status: res.status, error: errorText }, 'Companies House API error');
    throw new Error(`Companies House API returned ${res.status}`);
  }

  const company = await res.json();

  return {
    companyNumber: company.company_number,
    companyName: company.company_name,
    companyStatus: company.company_status,
    companyType: company.type,
    dateOfCreation: company.date_of_creation,
    address: company.registered_office_address ? {
      line1: [company.registered_office_address.premises, company.registered_office_address.address_line_1].filter(Boolean).join(' '),
      line2: company.registered_office_address.address_line_2 || '',
      city: company.registered_office_address.locality || '',
      region: company.registered_office_address.region || '',
      postcode: company.registered_office_address.postal_code || '',
      country: company.registered_office_address.country || 'United Kingdom'
    } : null
  };
}

export async function handler(event) {
  const logger = createLogger('companies-house-lookup', event);
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const method = event.httpMethod || event.requestContext?.http?.method;
  const path = event.path || event.rawPath || '';

  logger.info({ method, path }, 'Companies House lookup request');

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return response(200, {}, origin);
  }

  try {
    // GET /admin/companies-house/search?q=company+name
    if (method === 'GET' && path.includes('/search')) {
      const query = event.queryStringParameters?.q;

      if (!query || query.length < 2) {
        return response(400, { error: 'Query must be at least 2 characters' }, origin);
      }

      const results = await searchCompanies(query, logger);
      return response(200, results, origin);
    }

    // GET /admin/companies-house/{companyNumber}
    if (method === 'GET') {
      const pathParts = path.split('/').filter(Boolean);
      const companyNumber = pathParts[pathParts.length - 1];

      if (!companyNumber || companyNumber === 'companies-house') {
        return response(400, { error: 'Company number required' }, origin);
      }

      const company = await getCompany(companyNumber, logger);

      if (!company) {
        return response(404, { error: 'Company not found' }, origin);
      }

      return response(200, { company }, origin);
    }

    return response(404, { error: 'Not found' }, origin);

  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Error in companies-house-lookup');
    return response(500, { error: error.message || 'Internal server error' }, origin);
  }
}
