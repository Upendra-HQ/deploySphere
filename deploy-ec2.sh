#!/bin/bash

# DeploySphere AWS EC2 host provisioning script.
# Usage:
#   REPO_URL=https://github.com/<your-user>/<your-repo>.git ./deploy-ec2.sh

set -euo pipefail

echo "=== STARTING AWS EC2 ENVIRONMENT PROVISIONING ==="

REPO_URL="${REPO_URL:-}"
TARGET_DIR="${TARGET_DIR:-$HOME/deploysphere-app}"

if [ -z "$REPO_URL" ]; then
  echo "REPO_URL is required. Example:"
  echo "REPO_URL=https://github.com/<your-user>/<your-repo>.git ./deploy-ec2.sh"
  exit 1
fi

echo "[1/6] Updating APT repositories..."
sudo apt-get update -y
sudo apt-get upgrade -y

echo "[2/6] Installing core system packages..."
sudo apt-get install -y git curl apt-transport-https ca-certificates gnupg lsb-release

echo "[3/6] Installing Docker Engine..."
if ! command -v docker >/dev/null 2>&1; then
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  sudo usermod -aG docker "$USER"
else
  echo "Docker already installed. Skipping..."
fi

echo "[4/6] Fetching repository code..."
if [ ! -d "$TARGET_DIR/.git" ]; then
  mkdir -p "$TARGET_DIR"
  git clone "$REPO_URL" "$TARGET_DIR"
else
  cd "$TARGET_DIR"
  git pull origin main
fi

echo "[5/6] Preparing production configuration..."
cd "$TARGET_DIR"
mkdir -p nginx/ssl nginx/conf.d

if [ ! -f ".env.production" ]; then
  cp .env.production.example .env.production
  echo "Created .env.production from example."
  echo "Edit .env.production with real domains and secrets before running production containers."
  exit 0
fi

echo "[6/6] Launching production services..."
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build

echo "=== AWS EC2 PROVISIONING COMPLETE ==="
echo "Frontend: configured by FRONTEND_URL in .env.production"
echo "Backend:  configured by BACKEND_URL in .env.production"
