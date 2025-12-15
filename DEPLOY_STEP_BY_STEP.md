# 🚀 Deployment: Step-by-Step Guide

**For**: LensRoom @ Ubuntu 24.04  
**Time**: ~15 minutes  
**Difficulty**: Easy

---

## ✅ **Prerequisites**

You have:
- ✅ Server access: `root@104.222.177.29`
- ✅ Supabase project
- ✅ KIE.ai API key
- ✅ All code files in local directory

---

## 📋 **STEP 1: Upload Code to Server** (5 min)

### **Option A: Using Git (Recommended)**

```bash
# 1. On local machine - commit changes
cd /Users/maratsagimov/Desktop/LensRoom.V2/lensroom-v2

git add .
git commit -m "feat: Add KIE reliable delivery system

- Add debug/kie endpoint for diagnostics
- Rewrite callback to upload to Storage
- Add sync fallback endpoint
- Add GenerationResult component
- Add database migration 011
- Add full deployment documentation"

git push origin main

# 2. On server - pull changes
ssh root@104.222.177.29
# Password: EDJwxEBDqn5z

cd /root/lensroom/frontend
git pull origin main

# Verify new files exist:
ls -la src/app/api/debug/kie/route.ts
ls -la src/app/api/kie/sync/route.ts
ls -la src/components/generator/generation-result.tsx
ls -la supabase/migrations/011_kie_reliable_delivery.sql
# All should show file info
```

### **Option B: Using SCP (Alternative)**

```bash
# On local machine
cd /Users/maratsagimov/Desktop/LensRoom.V2/lensroom-v2

# Upload files
sshpass -p 'EDJwxEBDqn5z' scp -r \
  src/app/api/debug \
  src/app/api/kie/sync \
  src/app/api/kie/callback/route.ts \
  src/app/api/kie/createTask/route.ts \
  src/components/generator/generation-result.tsx \
  supabase/migrations/011_kie_reliable_delivery.sql \
  DEPLOY_COMMANDS.sh \
  root@104.222.177.29:/root/lensroom/frontend/
```

---

## 🗄️ **STEP 2: Run Database Migration** (2 min)

```bash
# 1. Open Supabase Dashboard
# Go to: https://supabase.com/dashboard/project/YOUR_PROJECT

# 2. Click "SQL Editor" in left sidebar

# 3. On your local machine, copy migration file:
cat /Users/maratsagimov/Desktop/LensRoom.V2/lensroom-v2/supabase/migrations/011_kie_reliable_delivery.sql

# 4. Paste into SQL Editor

# 5. Click "Run" button

# 6. Verify success (should see: "Success. No rows returned")

# 7. Verify changes:
# Run this query in SQL Editor:
```

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'generations' 
  AND column_name IN ('provider', 'asset_url');
```

Expected result: 2 rows (provider, asset_url)

---

## 📦 **STEP 3: Install Dependencies** (2 min)

```bash
# On server
ssh root@104.222.177.29
cd /root/lensroom/frontend

# Check package manager (should be npm)
ls -la package-lock.json
# If exists: use npm ✅

# Install dependencies
npm install

# Expected output:
# added X packages, audited Y packages in Zs
# (no critical errors)
```

---

## 🔨 **STEP 4: Build Application** (3 min)

```bash
# Still on server
cd /root/lensroom/frontend

# Increase Node memory (for large builds)
export NODE_OPTIONS="--max-old-space-size=4096"

# Build
npm run build

# Expected output:
# ✓ Compiled successfully in XX.Xs
# Route (app) ...
# ○ (Static)  prerendered as static content
# ƒ (Dynamic)  server-rendered on demand
# 
# Should end with success message, no errors
```

---

## 🔄 **STEP 5: Restart PM2** (1 min)

```bash
# Still on server
pm2 restart lensroom --update-env

# Check status
pm2 status

# Expected:
# ┌─────┬──────────┬────────┬──────┬────────┐
# │ id  │ name     │ mode   │ ↺    │ status │
# ├─────┼──────────┼────────┼──────┼────────┤
# │ 0   │ lensroom │ fork   │ XXX  │ online │
# └─────┴──────────┴────────┴──────┴────────┘
```

---

## ✅ **STEP 6: Verify Deployment** (2 min)

```bash
# 1. Check PM2 logs
pm2 logs lensroom --lines 30

# Should NOT see:
# - "Error"
# - "Failed to compile"
# - "ECONNREFUSED"

# 2. Test health endpoint
curl http://localhost:3000/api/health

# Expected: {"status":"ok"}

# 3. Test public URL
curl https://lensroom.ru/api/health

# Expected: {"status":"ok"}

# 4. Test debug endpoint
curl https://lensroom.ru/api/debug/kie

# Expected: JSON with "timestamp", "summary", "recent_generations"
```

---

## 🧪 **STEP 7: Test Generation** (2-5 min)

### **Test Photo Generation** (1-2 min)

```bash
# 1. Open browser
open https://lensroom.ru/create

# 2. Login via Telegram (if needed)

# 3. Scroll down to find "🧪 KIE.ai Test Generator"

# 4. Click "Test FLUX.2 Pro"

# 5. Watch console (or server logs):
pm2 logs lensroom --lines 50 | grep "KIE"

# Expected logs:
[KIE createTask] Task created: task_xxx
[KIE createTask] Saved to database with status=generating
(wait 30-60 seconds)
[KIE callback] Received for task task_xxx, state: success
[KIE callback] Downloaded 250000 bytes
[KIE callback] Uploading to: user_id/image/gen_xxx.jpg
[KIE callback] ✅ Stored: https://...supabase.co/...
[KIE callback] ✅ SUCCESS in 1200ms

# 6. Click on the history item (bottom of page)
# 7. ✅ Image should load instantly!
```

### **Test Debug Endpoint**

```bash
# Get taskId from logs above (task_xxx)
curl "https://lensroom.ru/api/debug/kie?taskId=task_xxx"

# Expected JSON with:
# - "database": { "found": true, "status": "success", "asset_url": "https://..." }
# - "kie_api": { "status": { "data": { "state": "success" } } }
# - "diagnosis": ["✅ Success with asset_url - should work in UI"]
```

---

## 📊 **STEP 8: Monitor (Optional)** (ongoing)

### **Watch Logs Live**

```bash
# Terminal 1: All logs
pm2 logs lensroom

# Terminal 2: KIE activity only
pm2 logs lensroom | grep "KIE"

# Terminal 3: Errors only
pm2 logs lensroom --err
```

### **Check Database**

```sql
-- In Supabase SQL Editor:

-- Recent generations
SELECT 
  id, task_id, status, kind, asset_url, created_at
FROM generations
WHERE provider = 'kie'
ORDER BY created_at DESC
LIMIT 10;

-- Success rate
SELECT 
  status,
  COUNT(*) as count
FROM generations
WHERE provider = 'kie'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

---

## 🎯 **Success Criteria**

You're done when ALL of these work:

- [x] `pm2 status` shows `lensroom | online`
- [x] `curl https://lensroom.ru/api/health` returns `{"status":"ok"}`
- [x] `curl https://lensroom.ru/api/debug/kie` returns JSON
- [x] Photo generation works (test on `/create`)
- [x] History item click loads image
- [x] No errors in `pm2 logs`
- [x] Database has `provider` and `asset_url` columns

---

## 🐛 **Troubleshooting**

### **Build fails**

```bash
# Clear cache
rm -rf .next node_modules/.cache

# Clean install
rm -rf node_modules package-lock.json
npm install

# Retry build
npm run build
```

### **PM2 won't restart**

```bash
# Check logs
pm2 logs lensroom --err

# Delete and recreate
pm2 delete lensroom
pm2 start npm --name "lensroom" -- start
pm2 save
```

### **Health check fails**

```bash
# Check if port 3000 is listening
netstat -tulpn | grep 3000

# If not, check what went wrong
pm2 logs lensroom --err --lines 100

# Common issues:
# - ENV variables not loaded: pm2 restart lensroom --update-env
# - Port already in use: lsof -ti:3000 | xargs kill -9
```

### **Callback not working**

```bash
# Test callback URL manually
curl -X POST "https://lensroom.ru/api/kie/callback?secret=YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"taskId":"test_123","state":"success"}'

# Should return: {"error":"Generation not found"} (404) - OK for test
# Should NOT return: {"error":"Unauthorized"} (401) - check secret

# If 401, check ENV:
grep KIE_CALLBACK_SECRET /root/lensroom/frontend/.env.local
```

### **Image/video doesn't load in history**

```bash
# Debug specific generation
curl "https://lensroom.ru/api/debug/kie?taskId=task_xxx"

# Check "diagnosis" field for suggestions

# Manual sync if needed
curl "https://lensroom.ru/api/kie/sync?taskId=task_xxx"
```

---

## 📝 **Common Commands**

```bash
# Deploy updates
ssh root@104.222.177.29
cd /root/lensroom/frontend
git pull && npm install && npm run build && pm2 restart lensroom

# Check status
pm2 status

# View logs
pm2 logs lensroom
pm2 logs lensroom | grep "KIE"
pm2 logs lensroom --err

# Restart
pm2 restart lensroom
pm2 restart lensroom --update-env

# Debug
curl "https://lensroom.ru/api/debug/kie"
curl "https://lensroom.ru/api/debug/kie?taskId=task_xxx"

# Manual sync
curl "https://lensroom.ru/api/kie/sync?taskId=task_xxx"
```

---

## ✅ **Deployment Complete!**

If all steps passed:
- ✅ Code deployed
- ✅ Database migrated
- ✅ Application built
- ✅ PM2 restarted
- ✅ Tests passed
- ✅ Monitoring active

**Test now**: https://lensroom.ru/create

---

## 📚 **Next Steps**

1. **Setup SSH keys** (optional but recommended)
   - See `SSH_SETUP.md`
   - No more passwords!

2. **Monitor for 1 hour**
   - Watch logs: `pm2 logs lensroom`
   - Check DB: Recent generations in Supabase
   - Test more generations

3. **Configure alerts** (optional)
   - PM2 monitoring
   - Supabase webhooks
   - Error notifications

---

## 🆘 **Still Having Issues?**

1. **Check full logs**:
   ```bash
   pm2 logs lensroom --lines 200
   ```

2. **Check database**:
   ```sql
   SELECT * FROM generations ORDER BY created_at DESC LIMIT 5;
   ```

3. **Read full docs**:
   - `DEPLOYMENT_RUNBOOK.md` (complete guide)
   - `TROUBLESHOOTING.md` (common issues)

4. **Debug specific generation**:
   ```bash
   curl "https://lensroom.ru/api/debug/kie?taskId=task_xxx"
   ```

---

**Good luck! 🚀**

You now have a 100% reliable generation delivery system!
