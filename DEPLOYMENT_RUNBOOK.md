# 🚀 LensRoom Deployment Runbook

**Server**: Ubuntu 24.04 @ 104.222.177.29  
**Domain**: lensroom.ru  
**Stack**: Next.js + TypeScript + Supabase + PM2  
**Package Manager**: **npm** ✅

---

## 📋 **Prerequisites Checklist**

- [ ] Node.js 18+ installed
- [ ] PM2 installed globally
- [ ] Nginx configured
- [ ] SSL certificate (Let's Encrypt)
- [ ] Supabase project created
- [ ] KIE.ai API key obtained
- [ ] Git access to repository

---

## 🔐 **Step 1: Setup SSH Keys (Recommended)**

### **A. Generate SSH Key (on your local machine)**

```bash
# Generate new SSH key
ssh-keygen -t ed25519 -C "deploy@lensroom.ru" -f ~/.ssh/lensroom_deploy

# Output:
# ~/.ssh/lensroom_deploy (private key)
# ~/.ssh/lensroom_deploy.pub (public key)
```

### **B. Add Public Key to Server**

```bash
# Copy public key
cat ~/.ssh/lensroom_deploy.pub

# SSH to server (last time with password)
ssh root@104.222.177.29

# Add public key
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Paste your public key, save (Ctrl+O, Enter, Ctrl+X)
chmod 600 ~/.ssh/authorized_keys

# Test new key (from local machine)
ssh -i ~/.ssh/lensroom_deploy root@104.222.177.29
# Should connect without password!
```

### **C. Configure SSH Config (Optional)**

```bash
# On local machine
nano ~/.ssh/config
```

```
Host lensroom
    HostName 104.222.177.29
    User root
    IdentityFile ~/.ssh/lensroom_deploy
    IdentitiesOnly yes
```

Now you can connect with: `ssh lensroom`

### **D. Disable Password Auth (Optional, for security)**

```bash
# On server
sudo nano /etc/ssh/sshd_config

# Change:
PasswordAuthentication no
PubkeyAuthentication yes

# Restart SSH
sudo systemctl restart ssh
```

⚠️ **IMPORTANT**: Test SSH key auth works BEFORE disabling password!

---

## 🔧 **Step 2: Environment Variables**

### **Required ENV Variables**

```bash
# On server
cd /root/lensroom/frontend
nano .env.local
```

```bash
# ===== NEXT.JS =====
NEXT_PUBLIC_APP_URL=https://lensroom.ru
NODE_ENV=production

# ===== SUPABASE =====
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:[password]@db.your-project.supabase.co:5432/postgres

# ===== KIE.AI =====
KIE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KIE_MARKET_BASE_URL=https://api.kie.ai
KIE_UPLOAD_BASE_URL=https://kieai.redpandaai.co
KIE_CALLBACK_SECRET=your_random_secret_min_32_chars

# Generate callback secret:
# openssl rand -hex 32

# ===== TELEGRAM BOT =====
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_USERNAME=your_bot

# ===== PAYMENT (Optional) =====
PRODAMUS_SECRET_KEY=...
PRODAMUS_PROJECT_ID=...
PAYFORM_SECRET_KEY=...
PAYFORM_SHOP_ID=...

# ===== JWT =====
JWT_SECRET=your_jwt_secret_min_32_chars
```

### **Security Check**

```bash
# Verify permissions
chmod 600 .env.local

# Test variables loaded
source .env.local
echo $KIE_API_KEY | head -c 10  # Should show sk-xxxxx
```

---

## 📦 **Step 3: Initial Deployment**

### **A. Clone Repository (if first time)**

```bash
cd /root
mkdir -p lensroom
cd lensroom
git clone YOUR_REPO_URL frontend
cd frontend
```

### **B. Install Dependencies**

```bash
# Using npm
npm install

# If you see errors, clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### **C. Build Application**

```bash
npm run build

# Expected output:
# ✓ Compiled successfully
# Route (app) ... 46+ pages
```

### **D. Setup PM2**

```bash
# Install PM2 globally (if not installed)
npm install -g pm2

# Start application
pm2 start npm --name "lensroom" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it shows

# Check status
pm2 status
pm2 logs lensroom --lines 50
```

---

## 🔄 **Step 4: Regular Deployment**

### **Standard Deployment Flow**

```bash
#!/bin/bash
# File: deploy.sh

set -e  # Exit on error

echo "🚀 Deploying LensRoom..."

# 1. Pull latest code
cd /root/lensroom/frontend
git pull origin main

# 2. Install dependencies (if package.json changed)
npm install

# 3. Run database migrations (if any new)
# Check: supabase/migrations/
# Run in Supabase Dashboard > SQL Editor

# 4. Build
npm run build

# 5. Restart PM2
pm2 restart lensroom

# 6. Check status
pm2 status
sleep 3
pm2 logs lensroom --lines 20

echo "✅ Deployment complete!"
echo "🔗 Check: https://lensroom.ru"
```

### **Make it executable**

```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🗄️ **Step 5: Database Migrations**

### **Run Migrations in Supabase**

```bash
# 1. Go to Supabase Dashboard
open https://supabase.com/dashboard/project/YOUR_PROJECT

# 2. SQL Editor

# 3. Copy migration file content
cat supabase/migrations/011_kie_reliable_delivery.sql

# 4. Paste and Execute

# 5. Verify
```

```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'generations' 
  AND column_name IN ('provider', 'asset_url');
-- Should return 2 rows

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'generations';
-- Should return 1 row
```

---

## 🔍 **Step 6: Verification**

### **A. Health Checks**

```bash
# 1. Server is running
pm2 status
# lensroom should show: online

# 2. Port is listening
netstat -tulpn | grep 3000
# Should show: LISTEN on 3000

# 3. Nginx proxying
curl -I http://localhost:3000
# Should return: HTTP/1.1 200 OK

curl -I https://lensroom.ru
# Should return: HTTP/2 200

# 4. API endpoints
curl https://lensroom.ru/api/health
# {"status":"ok"}

curl https://lensroom.ru/api/debug/kie
# Should return JSON with recent generations
```

### **B. Database Checks**

```bash
# On server (if psql installed)
psql $DATABASE_URL -c "SELECT COUNT(*) FROM generations;"

# Or in Supabase Dashboard
```

```sql
-- Recent generations
SELECT 
  id, task_id, status, kind, asset_url, created_at
FROM generations
ORDER BY created_at DESC
LIMIT 10;

-- Check statuses
SELECT status, COUNT(*) 
FROM generations 
GROUP BY status;

-- Check storage
SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'generations';
```

### **C. Log Checks**

```bash
# Real-time logs
pm2 logs lensroom

# Recent errors
pm2 logs lensroom --err --lines 100

# Search for KIE activity
pm2 logs lensroom --lines 500 | grep -E "KIE|task_"

# Check for errors
pm2 logs lensroom --lines 500 | grep -iE "error|fail|exception"
```

---

## 🧪 **Step 7: Testing**

### **A. Test Photo Generation**

```bash
# 1. Open browser
open https://lensroom.ru/create

# 2. Login via Telegram

# 3. Test generation
# Click "Test FLUX.2 Pro"

# 4. Monitor logs
pm2 logs lensroom | grep "task_"

# Expected logs:
[KIE createTask] Task created: task_xxx
[KIE callback] Received for task task_xxx
[KIE callback] Downloaded 250000 bytes
[KIE callback] ✅ Stored: https://...supabase.co/...
[KIE callback] ✅ SUCCESS in 1200ms

# 5. Verify in DB
curl "https://lensroom.ru/api/debug/kie?taskId=task_xxx"
```

### **B. Test Video Generation**

```bash
# Same as photo, but:
open https://lensroom.ru/create/video

# Wait 2-5 minutes for video
```

### **C. Test History/Library**

```bash
# 1. Open library
open https://lensroom.ru/library

# 2. Click on recent generation

# 3. Verify:
# - Image/video loads
# - No "loading forever"
# - Download button works
```

---

## 🐛 **Step 8: Troubleshooting**

### **Problem 1: Build Fails**

```bash
# Clear everything
rm -rf .next node_modules/.cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

### **Problem 2: PM2 Won't Start**

```bash
# Check logs
pm2 logs lensroom --err

# Common issues:
# - Port 3000 already in use
lsof -ti:3000 | xargs kill -9

# - ENV variables not loaded
pm2 restart lensroom --update-env

# - Out of memory
pm2 restart lensroom --max-memory-restart 1G
```

### **Problem 3: Database Connection**

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# If fails:
# 1. Check DATABASE_URL in .env.local
# 2. Check firewall allows port 5432
# 3. Check Supabase project is active
```

### **Problem 4: Callback Not Working**

```bash
# Test callback endpoint
curl -X POST "https://lensroom.ru/api/kie/callback?secret=YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"taskId":"test_123","state":"success"}'

# Should return: 404 (generation not found) - OK for test
# Should NOT return: 401 (unauthorized) - SECRET wrong

# Check logs
pm2 logs lensroom | grep "callback"
```

### **Problem 5: Storage Upload Fails**

```sql
-- Check storage policies
SELECT policyname FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Should include:
-- "Service can manage all generation files"

-- Test upload manually
```

```bash
curl "https://YOUR_PROJECT.supabase.co/storage/v1/object/generations/test.txt" \
  -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -F file=@test.txt
```

---

## 📊 **Step 9: Monitoring**

### **Setup Monitoring (Optional)**

```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### **Key Metrics to Watch**

```sql
-- Success rate (last 24h)
SELECT 
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'success') as success,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / COUNT(*), 1) as rate
FROM generations
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Stuck generations (>10 min in generating)
SELECT 
  task_id,
  EXTRACT(EPOCH FROM (NOW() - created_at)) / 60 as minutes
FROM generations
WHERE status IN ('generating', 'queued')
  AND created_at < NOW() - INTERVAL '10 minutes'
ORDER BY created_at ASC;

-- Average completion time
SELECT 
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
FROM generations
WHERE status = 'success'
  AND created_at > NOW() - INTERVAL '24 hours';
```

---

## 🔒 **Step 10: Security Hardening**

### **A. Firewall Setup**

```bash
# Install UFW
sudo apt install ufw

# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable
sudo ufw enable
sudo ufw status
```

### **B. Fail2Ban (Brute Force Protection)**

```bash
# Install
sudo apt install fail2ban

# Configure
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Find [sshd] section, set:
enabled = true
maxretry = 3
bantime = 3600

# Restart
sudo systemctl restart fail2ban
sudo fail2ban-client status sshd
```

### **C. Regular Updates**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Node.js (if needed)
# Use nvm or n version manager

# Update PM2
npm install -g pm2@latest
pm2 update
```

---

## 📝 **Quick Reference Commands**

### **Deploy**
```bash
ssh lensroom
cd /root/lensroom/frontend
git pull && npm install && npm run build && pm2 restart lensroom
```

### **Logs**
```bash
pm2 logs lensroom                    # Live logs
pm2 logs lensroom --err              # Errors only
pm2 logs lensroom --lines 200        # Last 200 lines
pm2 logs lensroom | grep "KIE"       # Filter KIE activity
```

### **Restart**
```bash
pm2 restart lensroom                 # Restart app
pm2 restart lensroom --update-env    # Restart + reload ENV
pm2 reload lensroom                  # Zero-downtime restart
```

### **Debug**
```bash
# Debug specific generation
curl "https://lensroom.ru/api/debug/kie?taskId=task_xxx"

# Recent generations
curl "https://lensroom.ru/api/debug/kie"

# Manual sync
curl "https://lensroom.ru/api/kie/sync?taskId=task_xxx"
```

### **Database**
```sql
-- Check table
SELECT * FROM generations ORDER BY created_at DESC LIMIT 10;

-- Fix stuck generation
-- Get taskId from DB, then:
```
```bash
curl "https://lensroom.ru/api/kie/sync?taskId=task_xxx"
```

---

## 🎯 **Deployment Checklist**

- [ ] SSH key configured (password-free access)
- [ ] ENV variables set in `.env.local`
- [ ] Dependencies installed (`npm install`)
- [ ] Database migrations run (Supabase Dashboard)
- [ ] Application built (`npm run build`)
- [ ] PM2 running (`pm2 status`)
- [ ] Nginx configured and SSL active
- [ ] Health check passes (`/api/health`)
- [ ] Test generation works (`/create`)
- [ ] Logs clean (no errors)
- [ ] Monitoring setup (PM2 logs, DB queries)

---

## 🆘 **Emergency Procedures**

### **Site Down**

```bash
# 1. Check PM2
pm2 status
pm2 restart lensroom

# 2. Check Nginx
sudo nginx -t
sudo systemctl status nginx
sudo systemctl restart nginx

# 3. Check disk space
df -h

# 4. Check memory
free -h

# 5. Check logs
pm2 logs lensroom --err --lines 100
```

### **Rollback**

```bash
# Go to previous commit
cd /root/lensroom/frontend
git log --oneline | head -10
git reset --hard PREVIOUS_COMMIT_HASH
npm install
npm run build
pm2 restart lensroom
```

---

## 📚 **Resources**

- **Next.js Docs**: https://nextjs.org/docs
- **PM2 Docs**: https://pm2.keymetrics.io/docs
- **Supabase Docs**: https://supabase.com/docs
- **KIE.ai Docs**: https://docs.kie.ai
- **Nginx Config**: `/etc/nginx/sites-available/lensroom.ru`

---

**✅ Runbook Complete!**

Now you have a complete deployment and maintenance guide for LensRoom.

For questions or issues, check logs first:
```bash
pm2 logs lensroom | tail -100
```
