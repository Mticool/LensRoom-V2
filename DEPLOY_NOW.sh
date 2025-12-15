#!/bin/bash
# ===============================================
# KIE.AI RELIABLE DELIVERY - DEPLOY SCRIPT
# ===============================================
# Run this on VDS to deploy all changes
# ===============================================

set -e  # Exit on error

echo "=================================================="
echo "🚀 Deploying KIE.ai Reliable Delivery"
echo "=================================================="
echo ""

# 1. Navigate to project
echo "📁 Step 1: Navigate to project..."
cd /root/lensroom/frontend || exit 1
echo "✅ Current directory: $(pwd)"
echo ""

# 2. Pull latest code
echo "📥 Step 2: Pull latest code..."
git pull
echo "✅ Code updated"
echo ""

# 3. Check new files exist
echo "📋 Step 3: Verify new files..."
FILES=(
  "supabase/migrations/011_kie_reliable_delivery.sql"
  "src/app/api/kie/sync/route.ts"
  "src/components/generator/generation-result.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ MISSING: $file"
    exit 1
  fi
done
echo ""

# 4. Build
echo "🔨 Step 4: Building..."
npm run build
echo "✅ Build complete"
echo ""

# 5. Restart PM2
echo "🔄 Step 5: Restarting PM2..."
pm2 restart lensroom
sleep 3
pm2 status
echo "✅ PM2 restarted"
echo ""

# 6. Show logs
echo "📊 Step 6: Showing logs (Ctrl+C to exit)..."
echo "Watch for: [KIE callback] and [KIE sync] messages"
echo ""
pm2 logs lensroom --lines 50

echo ""
echo "=================================================="
echo "✅ Deployment Complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Run migration in Supabase SQL Editor:"
echo "   supabase/migrations/011_kie_reliable_delivery.sql"
echo ""
echo "2. Test at:"
echo "   https://lensroom.ru/create"
echo ""
echo "3. Monitor:"
echo "   pm2 logs lensroom | grep KIE"
echo ""
echo "=================================================="
