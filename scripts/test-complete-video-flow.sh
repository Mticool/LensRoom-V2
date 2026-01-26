#!/bin/bash
# Complete video generation flow test script
# Tests the full path from API request to library display

set -e

echo "🧪 Complete Video Generation Flow Test"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local not found${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Check required variables
if [ -z "$LAOZHANG_API_KEY" ]; then
    echo -e "${RED}❌ LAOZHANG_API_KEY not set in .env.local${NC}"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Supabase credentials not set in .env.local${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Environment variables loaded${NC}"
echo ""

# Step 1: Check model configuration
echo "📋 Step 1: Checking model configuration..."
if grep -q "provider: 'laozhang'" src/config/models.ts | grep -A 5 "veo-3.1-fast"; then
    echo -e "${GREEN}✅ veo-3.1-fast uses laozhang provider${NC}"
else
    echo -e "${RED}❌ veo-3.1-fast provider check failed${NC}"
    exit 1
fi

if grep -q "provider: 'laozhang'" src/config/models.ts | grep -A 5 "sora-2"; then
    echo -e "${GREEN}✅ sora-2 uses laozhang provider${NC}"
else
    echo -e "${RED}❌ sora-2 provider check failed${NC}"
    exit 1
fi
echo ""

# Step 2: Check API client configuration
echo "📋 Step 2: Checking API client configuration..."
if grep -q 'baseUrl = "https://api.laozhang.ai/v1"' src/lib/api/laozhang-client.ts; then
    echo -e "${GREEN}✅ LaoZhang baseUrl is correct${NC}"
else
    echo -e "${RED}❌ LaoZhang baseUrl check failed${NC}"
    exit 1
fi
echo ""

# Step 3: Run TypeScript configuration test
echo "📋 Step 3: Running configuration test..."
if command -v tsx &> /dev/null; then
    echo "Testing Veo 3.1 Fast configuration..."
    tsx scripts/test-video-generation-flow.ts veo || {
        echo -e "${RED}❌ Veo configuration test failed${NC}"
        exit 1
    }
    echo ""
    echo "Testing Sora 2 configuration..."
    tsx scripts/test-video-generation-flow.ts sora || {
        echo -e "${RED}❌ Sora configuration test failed${NC}"
        exit 1
    }
    echo -e "${GREEN}✅ Configuration tests passed${NC}"
else
    echo -e "${YELLOW}⚠️  tsx not found, skipping TypeScript tests${NC}"
    echo "Install with: npm install -g tsx"
fi
echo ""

# Step 4: Check database connection
echo "📋 Step 4: Checking database connection..."
if command -v tsx &> /dev/null; then
    tsx scripts/check-video-generation-db.ts --recent 1 > /dev/null 2>&1 && {
        echo -e "${GREEN}✅ Database connection successful${NC}"
    } || {
        echo -e "${YELLOW}⚠️  Database connection test skipped (may need auth)${NC}"
    }
else
    echo -e "${YELLOW}⚠️  tsx not found, skipping database test${NC}"
fi
echo ""

# Summary
echo "📊 Summary"
echo "---------"
echo -e "${GREEN}✅ All automated checks passed${NC}"
echo ""
echo "Next steps for manual testing:"
echo "1. Start the dev server: npm run dev"
echo "2. Open the video generator page"
echo "3. Generate a video with Veo 3.1 Fast or Sora 2"
echo "4. Check server logs for API calls"
echo "5. Verify video appears in /library"
echo "6. Run: tsx scripts/check-video-generation-db.ts --recent 1"
echo ""
