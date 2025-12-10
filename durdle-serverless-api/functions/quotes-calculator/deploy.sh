#!/bin/bash
# deploy.sh - Deployment script for quotes-calculator Lambda
# This script ensures correct files are included and production-only dependencies
set -e

FUNCTION_NAME="quotes-calculator-dev"
REGION="eu-west-2"
FILES="index.mjs,validation.mjs,pricing-engine.mjs"

echo "=== Deploying $FUNCTION_NAME ==="
echo ""

# Production dependencies only (AWS SDK provided by Lambda runtime)
echo "[1/4] Installing production dependencies..."
rm -rf node_modules package-lock.json
npm install --production --silent

# Create ZIP with correct files
echo "[2/4] Creating deployment ZIP..."
rm -f function.zip
powershell -Command "Compress-Archive -Path $FILES,node_modules -DestinationPath function.zip -Force"

# Verify size
echo "[3/4] Verifying ZIP size..."
ZIP_SIZE=$(ls -lh function.zip | awk '{print $5}')
echo "       ZIP size: $ZIP_SIZE"

# Check if size > 5MB (warning threshold)
SIZE_BYTES=$(stat -c%s function.zip 2>/dev/null || stat -f%z function.zip)
SIZE_MB=$((SIZE_BYTES / 1048576))
if [ $SIZE_MB -gt 5 ]; then
  echo "WARNING: ZIP > 5MB - review dependencies!"
fi

# Deploy
echo "[4/4] Deploying to AWS..."
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://function.zip \
  --region $REGION \
  --query 'LastModified' \
  --output text

echo ""
echo "=== $FUNCTION_NAME deployed successfully ==="
