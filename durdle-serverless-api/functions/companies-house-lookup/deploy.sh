#!/bin/bash
# companies-house-lookup Lambda deployment script
# Usage: ./deploy.sh [create|update]
# NOTE: This Lambda has no dependencies - just index.mjs

set -e

FUNCTION_NAME="companies-house-lookup-dev"
REGION="eu-west-2"
LAYER_ARN="arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5"
ROLE_ARN="arn:aws:iam::771551874768:role/durdle-lambda-execution-role-dev"

echo "=== companies-house-lookup deployment ==="

# Verify required files exist
echo "Verifying required files..."
if [ ! -f "index.mjs" ]; then
  echo "ERROR: Required file missing: index.mjs"
  exit 1
fi
echo "All required files present."

# Create ZIP (no node_modules needed)
echo "Creating deployment ZIP..."
rm -f function.zip
if command -v zip &> /dev/null; then
  zip function.zip index.mjs
else
  echo "Using PowerShell for ZIP creation..."
  powershell -Command "Compress-Archive -Path 'index.mjs' -DestinationPath 'function.zip' -Force"
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
    --memory-size 128 \
    --layers $LAYER_ARN \
    --environment "Variables={COMPANIES_HOUSE_API_KEY=placeholder}" \
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
