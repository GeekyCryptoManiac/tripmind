#!/bin/bash
# ============================================================
# deploy.sh
# Re-deploy TripMind backend on EC2.
# Run manually now; GitHub Actions will call this automatically next session.
#
# Usage (from EC2):
#   bash ~/tripmind/backend/scripts/deploy.sh
# ============================================================

set -e

REGION="ap-southeast-1"
APP_DIR="/home/ubuntu/tripmind"

echo "[deploy] Pulling latest code..."
cd "$APP_DIR"
git pull origin main

cd backend

echo "[deploy] Refreshing secrets from SSM..."
DATABASE_URL=$(aws ssm get-parameter --name "/tripmind/prod/DATABASE_URL" --with-decryption --query "Parameter.Value" --output text --region "$REGION")
OPENAI_API_KEY=$(aws ssm get-parameter --name "/tripmind/prod/OPENAI_API_KEY" --with-decryption --query "Parameter.Value" --output text --region "$REGION")
SECRET_KEY=$(aws ssm get-parameter --name "/tripmind/prod/SECRET_KEY" --with-decryption --query "Parameter.Value" --output text --region "$REGION")
DEBUG=$(aws ssm get-parameter --name "/tripmind/prod/DEBUG" --query "Parameter.Value" --output text --region "$REGION")
FRONTEND_URL=$(aws ssm get-parameter --name "/tripmind/prod/FRONTEND_URL" --query "Parameter.Value" --output text --region "$REGION")

cat > .env.prod << EOF
DATABASE_URL=$DATABASE_URL
OPENAI_API_KEY=$OPENAI_API_KEY
SECRET_KEY=$SECRET_KEY
DEBUG=$DEBUG
FRONTEND_URL=$FRONTEND_URL
EOF

echo "[deploy] Rebuilding and restarting container..."
docker compose -f docker-compose.prod.yml up -d --build

echo "[deploy] Running migrations..."
docker exec tripmind_backend alembic upgrade head

echo "[deploy] ✅ Deploy complete."