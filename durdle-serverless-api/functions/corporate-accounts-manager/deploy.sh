#!/bin/bash
# corporate-accounts-manager Lambda deployment script
# Usage: ./deploy.sh [create|update]

set -e

FUNCTION_NAME="corporate-accounts-manager-dev"
REGION="eu-west-2"
LAYER_ARN="arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5"
ROLE_ARN="arn:aws:iam::771551874768:role/durdle-lambda-execution-role-dev"

echo "=== corporate-accounts-manager deployment ==="

# Verify required files exist
echo "Verifying required files..."
REQUIRED_FILES=("index.mjs" "validation.mjs" "package.json")
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "ERROR: Required file missing: $file"
    exit 1
  fi
done
echo "All required files present."

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Create ZIP
echo "Creating deployment ZIP..."
rm -f function.zip
if command -v zip &> /dev/null; then
  zip -r function.zip index.mjs validation.mjs package.json package-lock.json node_modules
else
  echo "Using PowerShell for ZIP creation..."
  powershell -Command "Compress-Archive -Path 'index.mjs','validation.mjs','package.json','package-lock.json','node_modules' -DestinationPath 'function.zip' -Force"
fi

# Verify ZIP contents
echo "Verifying ZIP contents..."
if command -v unzip &> /dev/null; then
  unzip -l function.zip | grep -E "(index\.mjs|validation\.mjs)" || { echo "ERROR: ZIP missing required files"; exit 1; }
fi

# Check if creating or updating
if [ "$1" == "create" ]; then
  echo "Creating Lambda function..."
  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs20.x \
    --architectures arm64 \
    --handler index.handler \
    --role $ROLE_ARN \
    --zip-file fileb://function.zip \
    --timeout 30 \
    --memory-size 256 \
    --layers $LAYER_ARN \
    --environment "Variables={CORPORATE_TABLE_NAME=durdle-corporate-dev,CORPORATE_PORTAL_URL=https://dorsettransfercompany.flowency.build/corporate}" \
    --region $REGION
else
  echo "Updating Lambda function code..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://function.zip \
    --region $REGION
fi

echo "Waiting for update to complete..."
aws lambda wait function-updated --function-name $FUNCTION_NAME --region $REGION

echo "Verifying layer attachment..."
aws lambda get-function-configuration \
  --function-name $FUNCTION_NAME \
  --region $REGION \
  --query 'Layers[*].Arn'

echo "=== Deployment complete ==="
