#!/bin/bash
# kuhik-core VPS Deployment Script
# Usage: ./scripts/deploy.sh [branch]
# Default branch: main
# Designed to be run on the VPS directly

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/opt/kuhik-core"
BRANCH="${1:-main}"

echo -e "${YELLOW}🚀 kuhik-core deployment starting...${NC}"
echo "  Branch: $BRANCH"
echo "  Target: $PROJECT_DIR"
echo ""

# Step 1: Navigate to project
if [ ! -d "$PROJECT_DIR" ]; then
  echo -e "${RED}Project directory not found. Setup first:${NC}"
  echo "  sudo mkdir -p $PROJECT_DIR"
  echo "  sudo git clone <repo-url> $PROJECT_DIR"
  echo "  cd $PROJECT_DIR && cp .env.example .env && nano .env"
  exit 1
fi

cd "$PROJECT_DIR"

# Step 2: Pull latest code
echo -e "${YELLOW}📦 Pulling latest code...${NC}"
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
echo -e "${GREEN}✓ Code updated${NC}"

# Step 3: Check .env
if [ ! -f ".env" ]; then
  echo -e "${RED}.env file not found!${NC}"
  echo "  cp .env.example .env && nano .env"
  exit 1
fi

# Step 4: Validate required vars
source .env 2>/dev/null || true
if [ -z "${JWT_SECRET:-}" ] || [ -z "${JWT_REFRESH_SECRET:-}" ] || [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${RED}Missing required env vars: JWT_SECRET, JWT_REFRESH_SECRET, DATABASE_URL${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Environment valid${NC}"

# Step 5: Rebuild and restart
echo -e "${YELLOW}🐳 Rebuilding containers...${NC}"
docker compose down --timeout=30
docker compose pull 2>/dev/null || true
docker compose build --no-cache
docker compose up -d
echo -e "${GREEN}✓ Services started${NC}"

# Step 6: Wait for health
echo -e "${YELLOW}⏳ Waiting for health check...${NC}"
sleep 10
for i in $(seq 1 15); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/health 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Backend health check passed!${NC}"
    break
  fi
  echo "  Waiting... ($i/15)"
  sleep 4
done

# Step 7: Cleanup
docker image prune -f
echo -e "${GREEN}🧹 Cleanup complete${NC}"

# Step 8: Summary
echo ""
echo -e "${GREEN}✅✅✅ Deployment complete!${NC}"
echo "  API:   http://localhost:4000/api/health"
echo "  Proxy: http://localhost"
docker compose ps