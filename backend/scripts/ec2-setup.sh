#!/bin/bash
# ============================================================
# ec2-setup.sh
# Run ONCE after SSHing into a fresh EC2 Ubuntu 22.04 instance.
# Installs Docker, clones repo, pulls secrets from SSM,
# builds the container, runs Alembic migrations.
#
# Prerequisites on EC2:
#   - IAM role attached with SSM read access (AmazonSSMReadOnlyAccess)
#   - Git, curl available (they are on Ubuntu 22.04 by default)
#
# Usage:
#   chmod +x ec2-setup.sh && bash ec2-setup.sh
# ============================================================

set -e

REGION="ap-southeast-1"
REPO_URL="https://github.com/GeekyCryptoManiac/tripmind.git"   # update if repo name differs
APP_DIR="/home/ubuntu/tripmind"

echo "========================================"
echo " TripMind EC2 Bootstrap"
echo "========================================"

# ── 1. System packages ──────────────────────────────────────
echo "[1/6] Installing system packages..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release unzip

# ── 2. Docker ───────────────────────────────────────────────
echo "[2/6] Installing Docker..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Allow ubuntu user to run docker without sudo
sudo usermod -aG docker ubuntu
newgrp docker << 'DOCKERGROUP'

# ── 3. AWS CLI ──────────────────────────────────────────────
echo "[3/6] Installing AWS CLI v2..."
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
sudo /tmp/aws/install
rm -rf /tmp/awscliv2.zip /tmp/aws

# ── 4. Clone repo ───────────────────────────────────────────
echo "[4/6] Cloning repository..."
if [ -d "$APP_DIR" ]; then
  echo "  Repo already exists, pulling latest..."
  cd "$APP_DIR" && git pull
else
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR/backend"

# ── 5. Pull secrets from SSM → .env.prod ───────────────────
echo "[5/6] Pulling secrets from SSM Parameter Store..."
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

echo "  .env.prod written."

# ── 6. Build + run container ────────────────────────────────
echo "[6/6] Building Docker image and starting container..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "========================================"
echo " Container running. Running Alembic..."
echo "========================================"
docker exec tripmind_backend alembic upgrade head

echo ""
echo "✅ EC2 setup complete!"
echo "Backend is live at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000"
echo "Test: curl http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000/health"

DOCKERGROUP