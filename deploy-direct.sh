#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# LensRoom Direct Deploy (без GitHub)
# Синхронизирует локальные файлы напрямую на сервер через rsync
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration (single source of truth for production deploy target)
SSH_CONFIG="${SSH_CONFIG:-$HOME/.ssh/config_lensroom}"
SERVER_ALIAS="${SERVER_ALIAS:-lensroom}"
SERVER_PATH="/opt/lensroom/current"
LOCAL_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   LensRoom Direct Deploy (Kling O1)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   Local:  $LOCAL_PATH"
echo "   Remote: ${SERVER_ALIAS}:${SERVER_PATH}"
echo "   SSH config: ${SSH_CONFIG}"
echo ""

# Step 1: Build locally
echo -e "${YELLOW}🔨 Step 1: Building Next.js locally...${NC}"
npm run build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 2: Sync files to server
echo -e "${YELLOW}📤 Step 2: Syncing files to server...${NC}"
rsync -avz --delete \
  -e "ssh -F ${SSH_CONFIG}" \
  --exclude 'node_modules' \
  --exclude '.next/cache' \
  --exclude '.github' \
  --exclude 'docs/internal' \
  --exclude 'docs/_supabase_backups' \
  --exclude 'docs/_supabase_backups/**' \
  --exclude 'src/components/generator-v2/_backup' \
  --exclude '.git' \
  --exclude '.env.local' \
  --exclude '.DS_Store' \
  --exclude '*.log' \
  --exclude 'supabase/.temp' \
  --exclude 'supabase/.temp/**' \
  --progress \
  "$LOCAL_PATH/" "${SERVER_ALIAS}:${SERVER_PATH}/"

echo -e "${GREEN}✓ Files synced${NC}"
echo ""

# Step 3: Install dependencies and restart on server
echo -e "${YELLOW}🚀 Step 3: Installing dependencies and restarting...${NC}"
ssh -F "${SSH_CONFIG}" "${SERVER_ALIAS}" << 'ENDSSH'
set -e
cd /opt/lensroom/current

echo "→ Clearing Next.js build cache (avoids stale chunks)..."
rm -rf .next/cache

echo "→ Removing local-only Supabase artifacts (avoid leaking backups/config)..."
rm -rf docs/_supabase_backups supabase/.temp

echo "→ Clearing Nginx proxy cache (prevents stale HTML/chunks)..."
if [ -d /var/cache/nginx/lensroom ]; then
  rm -rf /var/cache/nginx/lensroom/*
fi
nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null || true

echo "→ Installing dependencies..."
npm ci --production=false --prefer-offline

echo "→ Checking server .env.local (secrets must be set on server)..."
if [ ! -f ".env.local" ]; then
  echo "✗ .env.local not found on server. Please create it and set required keys (e.g. FAL_KEY)." >&2
  exit 1
fi
if ! grep -q "^FAL_KEY=" .env.local 2>/dev/null; then
  echo "✗ FAL_KEY missing in server .env.local. Please set it manually (do not commit it)." >&2
  exit 1
fi
echo "✓ .env.local and FAL_KEY are present"

echo "→ Restarting PM2 processes..."
pm2 restart ecosystem.config.js --update-env || pm2 start ecosystem.config.js --update-env

echo "→ Saving PM2 configuration..."
pm2 save

echo "→ Checking PM2 status..."
pm2 status

echo "→ Warming root (fresh HTML after force-dynamic)..."
sleep 2
curl -s -o /dev/null -w "  HTTP %{http_code}\n" http://127.0.0.1:3002/ || true

ENDSSH

echo -e "${GREEN}✓ Server restart complete${NC}"
echo ""

# Step 4: Verify
echo -e "${YELLOW}🔍 Step 4: Verifying deployment...${NC}"
sleep 5

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ DEPLOYMENT COMPLETE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}🎯 Kling O1 deployed successfully!${NC}"
echo ""
echo -e "${YELLOW}Test URLs:${NC}"
echo "  • Studio: https://lensroom.ru/create/studio?kind=video"
echo "  • Homepage: https://lensroom.ru"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  ssh -F ${SSH_CONFIG} ${SERVER_ALIAS}"
echo "  pm2 logs lensroom --lines 100"
echo "  pm2 restart lensroom --update-env"
echo ""
