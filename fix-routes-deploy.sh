#!/bin/bash
# ==================================================
# LensRoom - Fix Routes & Library
# ==================================================
# Fixes:
# 1. /library - now shows generations (photo+video)
# 2. /prompts - new page for prompts library
# 3. Navigation updated
# ==================================================

set -e

echo "🔧 Fixing routes and library..."
echo ""

ssh lensroom << 'EOF'
set -e

cd ~/lensroom/frontend

echo "1️⃣ Pulling latest code..."
git pull origin main

echo ""
echo "2️⃣ Cleaning old build..."
rm -rf .next
rm -rf node_modules/.cache

echo ""
echo "3️⃣ Installing dependencies..."
npm install

echo ""
echo "4️⃣ Building..."
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

echo ""
echo "5️⃣ Restarting PM2..."
pm2 restart lensroom

echo ""
echo "6️⃣ Checking status..."
sleep 3
pm2 status

echo ""
echo "7️⃣ Recent logs..."
pm2 logs lensroom --lines 20 --nostream

echo ""
echo "✅ Done!"
echo ""
echo "🔍 Check these pages:"
echo "  ✓ https://lensroom.ru/create (Photo generator)"
echo "  ✓ https://lensroom.ru/create/video (Video generator)"
echo "  ✓ https://lensroom.ru/library (My results - generations)"
echo "  ✓ https://lensroom.ru/prompts (Prompts library)"
echo "  ✓ https://lensroom.ru/create/products (Marketplace tools)"
EOF
