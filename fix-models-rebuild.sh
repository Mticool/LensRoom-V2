#!/bin/bash
# ==========================================
# Fix Models Display - Full Rebuild
# ==========================================

echo "🔧 Fixing models display (photo/video swap)"
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
echo "4️⃣ Building fresh..."
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
echo "✅ Done! Check https://lensroom.ru"
EOF
