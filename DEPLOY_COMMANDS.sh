#!/bin/bash
# ===============================================
# LensRoom - Full Deployment Script
# ===============================================
# Run this on server: ./DEPLOY_COMMANDS.sh
# ===============================================

set -e  # Exit on error

echo "=================================================="
echo "🚀 LensRoom Deployment"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ===== CHECK PREREQUISITES =====
echo "📋 Step 1: Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node -v)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm: $(npm -v)${NC}"

if ! command -v pm2 &> /dev/null; then
    echo -e "${RED}❌ PM2 not found. Installing...${NC}"
    npm install -g pm2
fi
echo -e "${GREEN}✅ PM2: $(pm2 -v)${NC}"

echo ""

# ===== NAVIGATE TO PROJECT =====
echo "📁 Step 2: Navigate to project..."
cd /root/lensroom/frontend || exit 1
echo -e "${GREEN}✅ Current directory: $(pwd)${NC}"
echo ""

# ===== BACKUP CURRENT VERSION =====
echo "💾 Step 3: Backup current version..."
BACKUP_DIR="/root/lensroom/backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r .next "$BACKUP_DIR/" 2>/dev/null || echo "No .next to backup"
echo -e "${GREEN}✅ Backup saved to: $BACKUP_DIR${NC}"
echo ""

# ===== PULL LATEST CODE =====
echo "📥 Step 4: Pull latest code..."
git fetch origin
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"
git pull origin "$CURRENT_BRANCH"
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

# ===== CHECK NEW FILES =====
echo "📋 Step 5: Verify new files..."
NEW_FILES=(
    "src/app/api/debug/kie/route.ts"
    "src/app/api/kie/sync/route.ts"
    "src/components/generator/generation-result.tsx"
    "supabase/migrations/011_kie_reliable_delivery.sql"
)

ALL_EXIST=true
for file in "${NEW_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}  ✅ $file${NC}"
    else
        echo -e "${RED}  ❌ MISSING: $file${NC}"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = false ]; then
    echo -e "${RED}❌ Some files are missing. Aborting.${NC}"
    exit 1
fi
echo ""

# ===== CHECK ENV VARIABLES =====
echo "🔐 Step 6: Check environment variables..."
if [ ! -f ".env.local" ]; then
    echo -e "${RED}❌ .env.local not found!${NC}"
    echo "Create .env.local with required variables:"
    echo "  - KIE_API_KEY"
    echo "  - KIE_CALLBACK_SECRET"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

# Check critical ENV vars
source .env.local
if [ -z "$KIE_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  KIE_API_KEY not set${NC}"
fi
if [ -z "$KIE_CALLBACK_SECRET" ]; then
    echo -e "${YELLOW}⚠️  KIE_CALLBACK_SECRET not set${NC}"
fi

echo -e "${GREEN}✅ .env.local exists${NC}"
echo ""

# ===== INSTALL DEPENDENCIES =====
echo "📦 Step 7: Install dependencies..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# ===== BUILD =====
echo "🔨 Step 8: Building application..."
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    echo "Restoring from backup..."
    rm -rf .next
    cp -r "$BACKUP_DIR/.next" ./ 2>/dev/null
    exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# ===== RESTART PM2 =====
echo "🔄 Step 9: Restart PM2..."
pm2 restart lensroom --update-env

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  PM2 restart failed, trying to start...${NC}"
    pm2 start npm --name "lensroom" -- start
fi

sleep 3
pm2 status lensroom
echo -e "${GREEN}✅ PM2 restarted${NC}"
echo ""

# ===== HEALTH CHECK =====
echo "🏥 Step 10: Health check..."
sleep 5

HEALTH_CHECK=$(curl -s http://localhost:3000/api/health || echo "failed")
if [[ "$HEALTH_CHECK" == *"ok"* ]]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}❌ Health check failed: $HEALTH_CHECK${NC}"
    echo "Check logs: pm2 logs lensroom --lines 50"
fi
echo ""

# ===== SHOW LOGS =====
echo "📊 Step 11: Recent logs..."
pm2 logs lensroom --lines 30 --nostream
echo ""

# ===== REMINDER =====
echo "=================================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "=================================================="
echo ""
echo "⚠️  IMPORTANT: Run database migration manually!"
echo ""
echo "1. Go to Supabase Dashboard:"
echo "   https://supabase.com/dashboard"
echo ""
echo "2. SQL Editor"
echo ""
echo "3. Copy and execute:"
echo "   supabase/migrations/011_kie_reliable_delivery.sql"
echo ""
echo "=================================================="
echo ""
echo "🔍 Next steps:"
echo ""
echo "1. Test generation:"
echo "   https://lensroom.ru/create"
echo ""
echo "2. Debug endpoint:"
echo "   https://lensroom.ru/api/debug/kie"
echo ""
echo "3. Monitor logs:"
echo "   pm2 logs lensroom"
echo ""
echo "4. Check status:"
echo "   pm2 status"
echo ""
echo "=================================================="
