import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({ region: 'eu-west-2' });

const IMAGES_BUCKET_NAME = process.env.IMAGES_BUCKET_NAME || 'durdle-vehicle-images-dev';
const PRESIGNED_URL_EXPIRY = 300; // 5 minutes

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod !== 'POST') {
      return errorResponse(405, 'Method not allowed');
    }

    const data = JSON.parse(event.body);

    // Validate required fields
    if (!data.fileName || !data.fileType) {
      return errorResponse(400, 'Missing required fields: fileName, fileType');
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(data.fileType)) {
      return errorResponse(400, `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
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
      return errorResponse(400, 'File extension does not match MIME type');
    }

    // Generate unique filename
    const uuid = randomUUID();
    const folder = data.folder || 'vehicles';
    const key = `${folder}/${uuid}.${fileExtension}`;

    // Create presigned URL
    const command = new PutObjectCommand({
      Bucket: IMAGES_BUCKET_NAME,
      Key: key,
      ContentType: data.fileType
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY
    });

    const publicUrl = `https://${IMAGES_BUCKET_NAME}.s3.eu-west-2.amazonaws.com/${key}`;

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
    console.error('Error:', error);
    return errorResponse(500, 'Internal server error', error.message);
  }
};

function errorResponse(statusCode, message, details = null) {
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
