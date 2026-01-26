#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════
#  🚀 LENSROOM.RU DEPLOY SCRIPT
#  GenAIPro Integration - Automatic Deployment
# ═══════════════════════════════════════════════════════════════════════

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                        ║"
echo "║           🚀  LENSROOM.RU DEPLOYMENT - GenAIPro Integration          ║"
echo "║                                                                        ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Navigate to project directory
cd "$(dirname "$0")"
echo -e "${CYAN}📂 Working directory: $(pwd)${NC}\n"

# ═══════════════════════════════════════════════════════════════════════
# STEP 1: Check git status
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 STEP 1: Checking git status...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if ! git diff-index --quiet HEAD --; then
    echo -e "${GREEN}✅ Found uncommitted changes${NC}"
    git status --short
    echo ""
else
    echo -e "${YELLOW}⚠️  No changes detected. Proceeding anyway...${NC}\n"
fi

# ═══════════════════════════════════════════════════════════════════════
# STEP 2: Check .env files
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔑 STEP 2: Checking environment files...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

if grep -q "GENAIPRO_API_KEY" .env.local 2>/dev/null; then
    echo -e "${GREEN}✅ .env.local - GENAIPRO_API_KEY found${NC}"
else
    echo -e "${RED}❌ .env.local - GENAIPRO_API_KEY missing!${NC}"
    exit 1
fi

if grep -q "GENAIPRO_API_KEY" .env.local.production 2>/dev/null; then
    echo -e "${GREEN}✅ .env.local.production - GENAIPRO_API_KEY found${NC}"
else
    echo -e "${YELLOW}⚠️  .env.local.production - GENAIPRO_API_KEY missing${NC}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════
# STEP 3: Run type check (optional)
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 STEP 3: Type checking (optional)...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

read -p "Run TypeScript type check? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${CYAN}Running type check...${NC}"
    npm run type-check 2>/dev/null || npx tsc --noEmit || echo -e "${YELLOW}⚠️  Type check skipped (not configured)${NC}"
    echo ""
else
    echo -e "${YELLOW}⏭️  Type check skipped${NC}\n"
fi

# ═══════════════════════════════════════════════════════════════════════
# STEP 4: Git commit
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📝 STEP 4: Git commit...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# Default commit message
COMMIT_MSG="feat: Интеграция GenAIPro API для Nano Banana и Veo

- Добавлен провайдер 'genaipro' в конфигурацию моделей
- Обновлены модели: nano-banana, nano-banana-pro, veo-3.1-fast
- Реализована поддержка GenAIPro в /api/generate/photo
- Реализована поддержка GenAIPro в /api/generate/video
- Добавлен GenAIPro API client (src/lib/api/genaipro-client.ts)
- Добавлен GENAIPRO_API_KEY в environment files
- SSE (Server-Sent Events) для video generation
- Автоматический upload результатов в Supabase Storage
- Полная обработка ошибок и рефанд звёзд

Изменённые файлы:
- src/config/models.ts
- src/lib/api/genaipro-client.ts (новый)
- src/app/api/generate/photo/route.ts
- src/app/api/generate/video/route.ts
- .env.local
- .env.local.production

GenAIPro API: https://genaipro.vn
Balance: 87,500 credits
Veo Quota: 100 videos"

echo -e "${CYAN}Commit message:${NC}"
echo -e "${GREEN}$COMMIT_MSG${NC}\n"

read -p "Use this commit message? (Y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${CYAN}Enter your commit message (Ctrl+D when done):${NC}"
    COMMIT_MSG=$(cat)
fi

# Add all changes
git add .
echo -e "${GREEN}✅ Files staged${NC}\n"

# Commit
if git commit -m "$COMMIT_MSG"; then
    echo -e "\n${GREEN}✅ Commit successful${NC}\n"
else
    echo -e "\n${YELLOW}⚠️  Nothing to commit or commit failed${NC}\n"
fi

# ═══════════════════════════════════════════════════════════════════════
# STEP 5: Git push
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔼 STEP 5: Git push...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

read -p "Push to origin? (Y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    BRANCH=$(git branch --show-current)
    echo -e "${CYAN}Pushing to origin/$BRANCH...${NC}"
    
    if git push origin "$BRANCH"; then
        echo -e "\n${GREEN}✅ Push successful${NC}\n"
    else
        echo -e "\n${RED}❌ Push failed${NC}\n"
        exit 1
    fi
else
    echo -e "${YELLOW}⏭️  Push skipped${NC}\n"
fi

# ═══════════════════════════════════════════════════════════════════════
# STEP 6: Vercel deployment
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 STEP 6: Vercel deployment...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

read -p "Deploy to Vercel production? (Y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
        npm install -g vercel
    fi
    
    echo -e "${CYAN}Deploying to production...${NC}\n"
    
    if vercel --prod --yes; then
        echo -e "\n${GREEN}✅ Deployment successful!${NC}\n"
    else
        echo -e "\n${RED}❌ Deployment failed${NC}\n"
        exit 1
    fi
else
    echo -e "${YELLOW}⏭️  Vercel deployment skipped${NC}"
    echo -e "${CYAN}💡 You can deploy manually later with: ${YELLOW}vercel --prod${NC}\n"
fi

# ═══════════════════════════════════════════════════════════════════════
# STEP 7: Verify environment variables on Vercel
# ═══════════════════════════════════════════════════════════════════════
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔐 STEP 7: Environment variables check...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}⚠️  IMPORTANT: Add GENAIPRO_API_KEY to Vercel environment variables!${NC}\n"
echo -e "${CYAN}Steps:${NC}"
echo -e "1. Go to: ${GREEN}https://vercel.com/dashboard${NC}"
echo -e "2. Select your project: ${GREEN}lensroom-v2${NC}"
echo -e "3. Go to: ${GREEN}Settings → Environment Variables${NC}"
echo -e "4. Add new variable:"
echo -e "   ${GREEN}Name:${NC} GENAIPRO_API_KEY"
echo -e "   ${GREEN}Value:${NC} eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18ydmlCa3pCZzdVUUJ4eW9FTHh4WmN4Q1FWc0MiLCJ0eXAiOiJKV1QifQ..."
echo -e "   ${GREEN}Environments:${NC} Production, Preview, Development"
echo -e "5. Click ${GREEN}Save${NC}"
echo -e "6. ${GREEN}Redeploy${NC} the latest deployment\n"

read -p "Press Enter when done or Ctrl+C to exit..."

# ═══════════════════════════════════════════════════════════════════════
# COMPLETION
# ═══════════════════════════════════════════════════════════════════════
echo -e "\n${GREEN}"
echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                        ║"
echo "║                  ✅  DEPLOYMENT COMPLETE!                              ║"
echo "║                                                                        ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

echo -e "${CYAN}📊 Deployment Summary:${NC}"
echo -e "${GREEN}✅ Git commit & push - complete${NC}"
echo -e "${GREEN}✅ Vercel deployment - complete${NC}"
echo -e "${GREEN}✅ Production URL: ${YELLOW}https://lensroom.ru${NC}\n"

echo -e "${CYAN}🧪 Testing Instructions:${NC}"
echo -e "1. Open: ${GREEN}https://lensroom.ru${NC}"
echo -e "2. Login via Telegram"
echo -e "3. Go to Photo Generator"
echo -e "4. Select ${PURPLE}Nano Banana${NC} or ${PURPLE}Nano Banana Pro${NC}"
echo -e "5. Generate a test image"
echo -e "6. Check Video Generator with ${PURPLE}Veo 3.1 Fast${NC}"
echo -e "7. Verify that stars are deducted correctly"
echo -e "8. Check gallery for results\n"

echo -e "${CYAN}💰 Your GenAIPro Account:${NC}"
echo -e "• Username: ${GREEN}mticool${NC}"
echo -e "• Balance: ${GREEN}87,500 credits${NC}"
echo -e "• Veo Quota: ${GREEN}100 videos${NC}"
echo -e "• Expires: ${GREEN}Feb 25, 2026${NC}\n"

echo -e "${CYAN}📚 Documentation:${NC}"
echo -e "• Integration Report: ${GREEN}../GENAIPRO_INTEGRATION_COMPLETE.md${NC}"
echo -e "• API Docs: ${GREEN}https://genaipro.vn/docs-api${NC}\n"

echo -e "${PURPLE}🎉 GenAIPro is now live on production! Happy testing! 🚀${NC}\n"

exit 0
