#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# LensRoom Production Deployment Script - INSTANT PREVIEWS VERSION
# ═══════════════════════════════════════════════════════════════════════════
#
# Usage:
#   bash scripts/deploy-production.sh
#
# This script:
# 1. Builds Next.js application
# 2. Restarts PM2 processes with --update-env
# 3. Saves PM2 configuration
# 4. Shows status and logs
#
# ═══════════════════════════════════════════════════════════════════════════

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   LensRoom Production Deployment - INSTANT PREVIEWS${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo -e "${YELLOW}📁 Working directory: $PROJECT_DIR${NC}"
echo ""

# Check for .env.local
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local not found!${NC}"
    echo -e "${YELLOW}   Please create .env.local from .env.example${NC}"
    exit 1
fi
echo -e "${GREEN}✓ .env.local found${NC}"

# Check Node.js
NODE_VERSION=$(node -v 2>/dev/null || echo "not found")
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"

# Check PM2
PM2_VERSION=$(pm2 -v 2>/dev/null || echo "not found")
if [ "$PM2_VERSION" == "not found" ]; then
    echo -e "${YELLOW}⚠️  PM2 not found, installing...${NC}"
    npm install -g pm2
    PM2_VERSION=$(pm2 -v)
fi
echo -e "${GREEN}✓ PM2 ${PM2_VERSION}${NC}"
echo ""

# Step 1: Install dependencies if needed
echo -e "${YELLOW}📦 Step 1: Checking dependencies...${NC}"
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo -e "${YELLOW}   Installing dependencies...${NC}"
    npm ci --production=false
fi
echo -e "${GREEN}✓ Dependencies ready${NC}"
echo ""

# Step 2: Build Next.js
echo -e "${YELLOW}🔨 Step 2: Building Next.js application...${NC}"
npm run build
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 3: Deploy with PM2
echo -e "${YELLOW}🚀 Step 3: Deploying with PM2...${NC}"

# Check if processes exist
if pm2 list | grep -q "lensroom"; then
    echo -e "${YELLOW}   Restarting existing processes...${NC}"
    pm2 restart ecosystem.config.js --update-env
else
    echo -e "${YELLOW}   Starting new processes...${NC}"
    pm2 start ecosystem.config.js --update-env
fi

# Save PM2 configuration
pm2 save
echo -e "${GREEN}✓ PM2 processes updated and saved${NC}"
echo ""

# Step 4: Verify deployment
echo -e "${YELLOW}🔍 Step 4: Verifying deployment...${NC}"
sleep 3

echo ""
pm2 status

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ DEPLOYMENT COMPLETE${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Apply migration 027_instant_previews.sql to Supabase"
echo "  2. Check logs: pm2 logs lensroom --lines 50"
echo "  3. Check worker: pm2 logs lensroom-previews-worker --lines 50"
echo "  4. Test: npm run worker:previews:oneshot"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  pm2 logs lensroom --lines 200"
echo "  pm2 logs lensroom-previews-worker --lines 200"
echo "  pm2 restart all --update-env"
echo "  npm run previews:rebuild"
echo ""
