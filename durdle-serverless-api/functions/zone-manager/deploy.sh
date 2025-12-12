#!/bin/bash
# zone-manager Lambda deployment script
# Usage: ./deploy.sh [create|update]

set -e

FUNCTION_NAME="zone-manager-dev"
REGION="eu-west-2"
LAYER_ARN="arn:aws:lambda:eu-west-2:771551874768:layer:durdle-common-layer:5"
ROLE_ARN="arn:aws:iam::771551874768:role/durdle-lambda-execution-role-dev"

echo "=== zone-manager deployment ==="

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Create ZIP
echo "Creating deployment ZIP..."
if command -v zip &> /dev/null; then
  rm -f zone-manager.zip
  zip -r zone-manager.zip index.mjs package.json package-lock.json node_modules
else
  echo "Using PowerShell for ZIP creation..."
  powershell -Command "Compress-Archive -Path index.mjs,package.json,package-lock.json,node_modules -DestinationPath zone-manager.zip -Force"
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
    --zip-file fileb://zone-manager.zip \
    --timeout 30 \
    --memory-size 256 \
    --layers $LAYER_ARN \
    --environment "Variables={PRICING_TABLE_NAME=durdle-pricing-config-dev,UK_POSTCODES_TABLE_NAME=durdle-uk-postcodes-dev,ENVIRONMENT=dev}" \
    --region $REGION
else
  echo "Updating Lambda function code..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://zone-manager.zip \
    --region $REGION
fi

echo "Verifying layer attachment..."
aws lambda get-function-configuration \
  --function-name $FUNCTION_NAME \
  --region $REGION \
  --query 'Layers[*].Arn'

echo "=== Deployment complete ==="
