#!/bin/bash
# deploy.sh - Deployment script for vehicle-manager Lambda
# This script ensures correct files are included and production-only dependencies
set -e

FUNCTION_NAME="vehicle-manager-dev"
REGION="eu-west-2"
FILES="index.mjs"

echo "=== Deploying $FUNCTION_NAME ==="
echo ""

# Production dependencies only (AWS SDK provided by Lambda runtime)
echo "[1/4] Installing production dependencies..."
rm -rf node_modules package-lock.json
npm install --production --silent 2>/dev/null || echo "       No dependencies to install"

# Create ZIP with correct files
echo "[2/4] Creating deployment ZIP..."
rm -f function.zip
if [ -d "node_modules" ]; then
  powershell -Command "Compress-Archive -Path $FILES,node_modules -DestinationPath function.zip -Force"
else
  powershell -Command "Compress-Archive -Path $FILES -DestinationPath function.zip -Force"
fi

# Verify size
echo "[3/4] Verifying ZIP size..."
ZIP_SIZE=$(ls -lh function.zip | awk '{print $5}')
echo "       ZIP size: $ZIP_SIZE"

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
