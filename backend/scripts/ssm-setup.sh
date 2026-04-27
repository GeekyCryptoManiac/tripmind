#!/bin/bash
# ============================================================
# ssm-setup.sh
# Run ONCE from your local machine (with AWS CLI configured).
# Stores all TripMind secrets in SSM Parameter Store.
# Usage: bash scripts/ssm-setup.sh
# ============================================================

set -e

REGION="ap-southeast-1"   # Singapore — change if you pick a different region

echo "Storing TripMind secrets in SSM Parameter Store (region: $REGION)..."

read -p "DATABASE_URL (RDS connection string): " DATABASE_URL
read -p "OPENAI_API_KEY: " OPENAI_API_KEY
read -p "SECRET_KEY (JWT secret, use a long random string): " SECRET_KEY
read -p "DEBUG (False for prod): " DEBUG
read -p "FRONTEND_URL (your Vercel URL, e.g. https://tripmind.vercel.app): " FRONTEND_URL

aws ssm put-parameter \
  --name "/tripmind/prod/DATABASE_URL" \
  --value "$DATABASE_URL" \
  --type "SecureString" \
  --region "$REGION" \
  --overwrite

aws ssm put-parameter \
  --name "/tripmind/prod/OPENAI_API_KEY" \
  --value "$OPENAI_API_KEY" \
  --type "SecureString" \
  --region "$REGION" \
  --overwrite

aws ssm put-parameter \
  --name "/tripmind/prod/SECRET_KEY" \
  --value "$SECRET_KEY" \
  --type "SecureString" \
  --region "$REGION" \
  --overwrite

aws ssm put-parameter \
  --name "/tripmind/prod/DEBUG" \
  --value "$DEBUG" \
  --type "String" \
  --region "$REGION" \
  --overwrite

aws ssm put-parameter \
  --name "/tripmind/prod/FRONTEND_URL" \
  --value "$FRONTEND_URL" \
  --type "String" \
  --region "$REGION" \
  --overwrite

echo ""
echo "✅ All 5 parameters stored in SSM."
echo "Verify with: aws ssm get-parameters-by-path --path /tripmind/prod --region $REGION"