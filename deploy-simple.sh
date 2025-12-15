#!/bin/bash
# ===============================================
# LensRoom - Simple Deployment Script
# ===============================================
# Run from local machine after deploy user setup
# ===============================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=================================================="
echo "🚀 LensRoom - Simple Deployment"
echo "=================================================="
echo ""

# Configuration
SERVER_USER="deploy"
SERVER_HOST="104.222.177.29"
SSH_KEY="$HOME/.ssh/lensroom_deploy"
PROJECT_DIR="lensroom/frontend"

# Check SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    echo "Run setup first!"
    exit 1
fi

echo -e "${BLUE}Connecting to server...${NC}"
echo ""

# Run deployment on server
ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_HOST" << 'ENDSSH'
set -e

echo "📁 Navigating to project..."
cd ~/lensroom/frontend

echo ""
echo "📥 Pulling latest code..."
git pull origin main

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building application..."
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

echo ""
echo "🔄 Restarting PM2..."
pm2 restart lensroom

echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "📋 Recent logs:"
pm2 logs lensroom --lines 20 --nostream

echo ""
echo "✅ Deployment complete!"
ENDSSH

echo ""
echo "=================================================="
echo -e "${GREEN}✅ Deployment Successful!${NC}"
echo "=================================================="
echo ""
echo "🔍 Check application:"
echo "  https://lensroom.ru"
echo ""
echo "📊 View logs:"
echo "  ssh -i $SSH_KEY $SERVER_USER@$SERVER_HOST"
echo "  pm2 logs lensroom"
echo ""
