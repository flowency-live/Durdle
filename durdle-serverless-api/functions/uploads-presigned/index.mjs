import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { createLogger } from '/opt/nodejs/logger.mjs';
import { getTenantId, buildTenantS3Key, logTenantContext } from '/opt/nodejs/tenant.mjs';

const s3Client = new S3Client({ region: 'eu-west-2' });

const IMAGES_BUCKET_NAME = process.env.IMAGES_BUCKET_NAME || 'durdle-vehicle-images-dev';
const PRESIGNED_URL_EXPIRY = 300; // 5 minutes

// CORS configuration per ADMIN_ENDPOINT_STANDARD.md
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
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

export const handler = async (event, context) => {
  const logger = createLogger(event, context);
  const tenantId = getTenantId(event);
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const headers = getHeaders(origin);

  logger.info({ event: 'lambda_invocation', httpMethod: event.httpMethod }, 'Uploads presigned Lambda invoked');

  logTenantContext(logger, tenantId, 'uploads_presigned');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return errorResponse(405, 'Method not allowed', null, headers);
    }

    const data = JSON.parse(event.body);

    logger.info({ event: 'upload_url_request_start', fileName: data.fileName, fileType: data.fileType, tenantId }, 'Upload URL request started');

    // Validate required fields
    if (!data.fileName || !data.fileType) {
      logger.warn({
        event: 'upload_url_validation_error',
        reason: 'Missing required fields',
        fileName: data.fileName,
        fileType: data.fileType,
        tenantId
      }, 'Missing required fields');
      return errorResponse(400, 'Missing required fields: fileName, fileType', null, headers);
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(data.fileType)) {
      logger.warn({
        event: 'upload_url_validation_error',
        reason: 'Invalid file type',
        fileType: data.fileType,
        allowedTypes: ALLOWED_MIME_TYPES,
        tenantId
      }, 'Invalid file type');
      return errorResponse(400, `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`, null, headers);
    }

    // Extract file extension
    const fileExtension = data.fileName.split('.').pop().toLowerCase();

    // Validate extension matches MIME type
    const validExtensions = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/jpg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/webp': ['webp'],
      'image/gif': ['gif']
    };

    if (!validExtensions[data.fileType]?.includes(fileExtension)) {
      logger.warn({
        event: 'upload_url_validation_error',
        reason: 'Extension mismatch',
        fileName: data.fileName,
        fileType: data.fileType,
        extension: fileExtension,
        validExtensions: validExtensions[data.fileType],
        tenantId
      }, 'File extension does not match MIME type');
      return errorResponse(400, 'File extension does not match MIME type', null, headers);
    }

    // Generate unique filename with tenant-prefixed S3 key
    const uuid = randomUUID();
    const folder = data.folder || 'vehicles';
    const filename = `${uuid}.${fileExtension}`;
    const key = buildTenantS3Key(tenantId, folder, filename);

    // Create presigned URL
    logger.info({ event: 's3_presigned_url_generation', bucket: IMAGES_BUCKET_NAME, key, tenantId }, 'Generating presigned URL');

    const command = new PutObjectCommand({
      Bucket: IMAGES_BUCKET_NAME,
      Key: key,
      ContentType: data.fileType
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY
    });

    const publicUrl = `https://${IMAGES_BUCKET_NAME}.s3.eu-west-2.amazonaws.com/${key}`;

    logger.info({
      event: 'upload_url_request_success',
      key,
      bucket: IMAGES_BUCKET_NAME,
      expiresIn: PRESIGNED_URL_EXPIRY,
      tenantId
    }, 'Presigned URL generated successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        uploadUrl,
        key,
        publicUrl,
        expiresIn: PRESIGNED_URL_EXPIRY
      })
    };
  } catch (error) {
    logger.error({
      event: 'lambda_error',
      errorMessage: error.message,
      errorStack: error.stack,
      tenantId
    }, 'Unhandled error in uploads presigned Lambda');
    return errorResponse(500, 'Internal server error', error.message, headers);
  }
};

function errorResponse(statusCode, message, details = null, headers) {
  const body = { error: message };
  if (details) {
    body.details = details;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify(body)
  };
}
