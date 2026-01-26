#!/bin/bash

echo "🔍 LensRoom 502 Fix Script"
echo "================================"
echo ""

# Check PM2 status
echo "1️⃣ Checking PM2 processes..."
pm2 list

echo ""
echo "2️⃣ Checking recent logs..."
pm2 logs lensroom --lines 50 --nostream

echo ""
echo "3️⃣ Checking if port 3002 is listening..."
if command -v lsof &> /dev/null; then
    lsof -i :3002
elif command -v netstat &> /dev/null; then
    netstat -tuln | grep 3002
else
    ss -tuln | grep 3002
fi

echo ""
echo "4️⃣ Attempting to restart application..."
cd /opt/lensroom/current

# Stop all processes
pm2 stop lensroom lensroom-previews-worker lensroom-monitor

# Delete old processes
pm2 delete lensroom lensroom-previews-worker lensroom-monitor 2>/dev/null || true

# Start fresh
pm2 start ecosystem.config.js --update-env

# Save configuration
pm2 save

echo ""
echo "5️⃣ Waiting 5 seconds for startup..."
sleep 5

echo ""
echo "6️⃣ New PM2 status:"
pm2 list

echo ""
echo "7️⃣ Testing health endpoint..."
curl -I http://127.0.0.1:3002/api/health

echo ""
echo "✅ Done! Check if site is accessible at https://lensroom.ru"
