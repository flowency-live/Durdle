#!/bin/bash
# Deployment Validation Script for quotes-calculator Lambda
# Run this BEFORE deploying to catch missing files early

echo "=========================================="
echo "quotes-calculator Deployment Validation"
echo "=========================================="
echo ""

ERRORS=0

# Required source files
REQUIRED_FILES=(
  "index.mjs"
  "validation.mjs"
  "pricing-engine.mjs"
  "logger.mjs"
  "package.json"
  "package-lock.json"
)

echo "Checking required files..."
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ Found: $file"
  else
    echo "❌ MISSING: $file"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "Checking node_modules..."
if [ -d "node_modules" ]; then
  echo "✅ Found: node_modules/"

  # Check critical dependencies
  if [ -d "node_modules/pino" ]; then
    echo "✅ Found: node_modules/pino (required by logger.mjs)"
  else
    echo "❌ MISSING: node_modules/pino - Run 'npm install'"
    ERRORS=$((ERRORS + 1))
  fi

  if [ -d "node_modules/zod" ]; then
    echo "✅ Found: node_modules/zod (required by validation.mjs)"
  else
    echo "❌ MISSING: node_modules/zod - Run 'npm install'"
    ERRORS=$((ERRORS + 1))
  fi

  if [ -d "node_modules/@aws-sdk" ]; then
    echo "✅ Found: node_modules/@aws-sdk (required by index.mjs)"
  else
    echo "❌ MISSING: node_modules/@aws-sdk - Run 'npm install'"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo "❌ MISSING: node_modules/ - Run 'npm install'"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "Checking for files that should NOT be deployed..."
EXCLUDE_FILES=(
  "tests"
  "coverage"
  "jest.config.mjs"
)

for file in "${EXCLUDE_FILES[@]}"; do
  if [ -e "$file" ]; then
    echo "⚠️  WARNING: $file exists (exclude from deployment ZIP)"
  fi
done

echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
  echo "✅ VALIDATION PASSED"
  echo "All required files present."
  echo "Ready to create deployment package."
  echo ""
  echo "Next steps:"
  echo "1. powershell -Command \"Compress-Archive -Path index.mjs,validation.mjs,pricing-engine.mjs,logger.mjs,package.json,package-lock.json,node_modules -DestinationPath function.zip -Force\""
  echo "2. aws lambda update-function-code --function-name quotes-calculator-dev --zip-file fileb://function.zip --region eu-west-2"
  exit 0
else
  echo "❌ VALIDATION FAILED"
  echo "Found $ERRORS error(s). Fix before deploying."
  echo ""
  echo "Run 'npm install' to install missing dependencies."
  echo "Check STRUCTURE.md for required files."
  exit 1
fi
