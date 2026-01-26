#!/bin/bash

# LensRoom.V2 Deployment Script
# Автоматический deploy на сервер с проверками

set -e  # Exit on any error

echo "🚀 Starting LensRoom.V2 Deployment"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_USER="${SERVER_USER:-root}"
SERVER_HOST="${SERVER_HOST:-your-server.com}"
SERVER_PATH="${SERVER_PATH:-/var/www/lensroom-v2}"
PM2_APP_NAME="${PM2_APP_NAME:-lensroom}"

echo "📋 Configuration:"
echo "   Server: ${SERVER_USER}@${SERVER_HOST}"
echo "   Path: ${SERVER_PATH}"
echo "   PM2 App: ${PM2_APP_NAME}"
echo ""

# Step 1: Pre-deploy checks (can be skipped)
SKIP_PRECHECKS="${SKIP_PRECHECKS:-0}"
echo "✓ Step 1: Pre-deploy checks"
if [[ "$SKIP_PRECHECKS" == "1" ]]; then
    echo -e "${YELLOW}   ⚠ Skipping pre-checks (SKIP_PRECHECKS=1)${NC}"
    echo ""
else
    echo "   Checking git status..."
    if [[ -n $(git status --porcelain) ]]; then
        echo -e "${RED}✗ Error: Uncommitted changes found${NC}"
        echo "   Please commit or stash your changes"
        exit 1
    fi
    echo -e "${GREEN}   ✓ Git is clean${NC}"

    echo "   Checking branch..."
    CURRENT_BRANCH=$(git branch --show-current)
    if [[ "$CURRENT_BRANCH" != "main" ]]; then
        echo -e "${YELLOW}   Warning: Not on main branch (current: $CURRENT_BRANCH)${NC}"
        read -p "   Continue? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    echo -e "${GREEN}   ✓ Branch: $CURRENT_BRANCH${NC}"

    echo "   Running build test..."
    if ! npm run build > /dev/null 2>&1; then
        echo -e "${RED}✗ Error: Build failed${NC}"
        echo "   Please fix build errors before deploying"
        exit 1
    fi
    echo -e "${GREEN}   ✓ Build passed${NC}"
    echo ""
fi

if [[ -z "$CURRENT_BRANCH" ]]; then
    CURRENT_BRANCH=$(git branch --show-current)
fi

# Step 2: Push to remote
echo "✓ Step 2: Push to remote"
read -p "   Push to origin/$CURRENT_BRANCH? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   Pushing..."
    git push origin "$CURRENT_BRANCH"
    echo -e "${GREEN}   ✓ Pushed to remote${NC}"
else
    echo -e "${YELLOW}   Skipped push${NC}"
fi
echo ""

# Step 3: Deploy to server
echo "✓ Step 3: Deploy to server"
read -p "   Deploy to ${SERVER_HOST}? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}   Deployment cancelled${NC}"
    exit 0
fi

echo "   Connecting to server..."
ssh "${SERVER_USER}@${SERVER_HOST}" bash << 'ENDSSH'
set -e

echo "   → Connected to server"
echo "   → Navigating to project directory..."
cd "${SERVER_PATH}" || exit 1

echo "   → Pulling latest code..."
git fetch origin
git reset --hard origin/main

echo "   → Installing dependencies..."
npm ci --prefer-offline

echo "   → Building production bundle..."
NODE_ENV=production npm run build

echo "   → Restarting PM2 process..."
pm2 restart "${PM2_APP_NAME}" || pm2 start npm --name "${PM2_APP_NAME}" -- start

echo "   → Checking PM2 status..."
pm2 status "${PM2_APP_NAME}"

echo ""
echo "✅ Deployment completed successfully!"
ENDSSH

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}   ✓ Server deployment successful${NC}"
else
    echo -e "${RED}   ✗ Server deployment failed${NC}"
    exit 1
fi
echo ""

# Step 4: Post-deploy verification
echo "✓ Step 4: Post-deploy verification"
echo "   Waiting 5 seconds for app to start..."
sleep 5

echo "   Testing server response..."
if command -v curl &> /dev/null; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://${SERVER_HOST}" || echo "000")
    if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "301" ]] || [[ "$HTTP_CODE" == "302" ]]; then
        echo -e "${GREEN}   ✓ Server is responding (HTTP $HTTP_CODE)${NC}"
    else
        echo -e "${YELLOW}   ⚠ Server response: HTTP $HTTP_CODE${NC}"
        echo "   Please check manually"
    fi
else
    echo -e "${YELLOW}   ⚠ curl not found, skipping health check${NC}"
fi
echo ""

# Summary
echo "=================================="
echo "🎉 Deployment Complete!"
echo ""
echo "📊 Summary:"
echo "   Branch: $CURRENT_BRANCH"
echo "   Server: ${SERVER_USER}@${SERVER_HOST}"
echo "   Path: ${SERVER_PATH}"
echo ""
echo "📝 Next steps:"
echo "   1. Test key pages:"
echo "      - Homepage: http://${SERVER_HOST}/"
echo "      - Pricing: http://${SERVER_HOST}/pricing"
echo "      - Studio: http://${SERVER_HOST}/create/studio"
echo "      - Library: http://${SERVER_HOST}/library"
echo ""
echo "   2. Check logs:"
echo "      ssh ${SERVER_USER}@${SERVER_HOST}"
echo "      pm2 logs ${PM2_APP_NAME}"
echo ""
echo "   3. Monitor for 24 hours"
echo ""
echo "🔄 Rollback (if needed):"
echo "   ssh ${SERVER_USER}@${SERVER_HOST}"
echo "   cd ${SERVER_PATH}"
echo "   git reset --hard HEAD~15"
echo "   npm ci && npm run build"
echo "   pm2 restart ${PM2_APP_NAME}"
echo ""



