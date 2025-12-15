# 🔐 Secure Deployment Guide - Step by Step

**Goal**: Setup secure, password-free deployment with `deploy` user  
**Time**: 15 minutes  
**Current**: root + password ❌  
**Target**: deploy + SSH key ✅

---

## 📋 **What You'll Get**

- ✅ Dedicated `deploy` user (no more root!)
- ✅ SSH key authentication (no more passwords!)
- ✅ Proper permissions (sudo, PM2, project)
- ✅ Simple deployment command
- ✅ Secure by default

---

## 🚀 **Quick Start (3 Commands)**

### **On Your Local Machine**

```bash
# 1. Check SSH key exists
ls -la ~/.ssh/lensroom_deploy*

# If not found, key is already generated!
# Location: ~/.ssh/lensroom_deploy
# Public key: ~/.ssh/lensroom_deploy.pub
```

### **On Server (via SSH)**

```bash
# 1. Copy setup script to server
scp -p 'EDJwxEBDqn5z' \
  ~/Desktop/LensRoom.V2/lensroom-v2/setup-deploy-user.sh \
  root@104.222.177.29:/tmp/

# 2. SSH to server
ssh root@104.222.177.29
# Password: EDJwxEBDqn5z (last time!)

# 3. Run setup script
sudo bash /tmp/setup-deploy-user.sh
```

### **Test New Access**

```bash
# From local machine
ssh -i ~/.ssh/lensroom_deploy deploy@104.222.177.29

# Should work without password! ✅
```

---

## 📖 **Detailed Step-by-Step**

### **STEP 1: Verify SSH Key (Local Machine)**

```bash
# Check key exists
ls -la ~/.ssh/lensroom_deploy*

# Expected output:
# -rw-------  1 user  staff  411 Dec 15 10:00 lensroom_deploy
# -rw-r--r--  1 user  staff   98 Dec 15 10:00 lensroom_deploy.pub

# View public key
cat ~/.ssh/lensroom_deploy.pub

# Should show:
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOd5FExyo/lXcS8NloELYjQ6Jx2oPbnsJLvg6qqO7iSk deploy@lensroom.ru
```

✅ **Key is ready!**

---

### **STEP 2: Upload Setup Script to Server**

#### **Option A: SCP (Recommended)**

```bash
cd ~/Desktop/LensRoom.V2/lensroom-v2

# Upload script
scp setup-deploy-user.sh root@104.222.177.29:/tmp/

# Enter password when prompted: EDJwxEBDqn5z
```

#### **Option B: Copy-Paste (Alternative)**

```bash
# 1. SSH to server
ssh root@104.222.177.29

# 2. Create script
nano /tmp/setup-deploy-user.sh

# 3. Copy content from setup-deploy-user.sh and paste

# 4. Save (Ctrl+O, Enter, Ctrl+X)

# 5. Make executable
chmod +x /tmp/setup-deploy-user.sh
```

---

### **STEP 3: Run Setup Script on Server**

```bash
# SSH to server (if not already connected)
ssh root@104.222.177.29
# Password: EDJwxEBDqn5z

# Run setup script
sudo bash /tmp/setup-deploy-user.sh
```

**Expected Output:**

```
==================================================
🔐 LensRoom - Deploy User Setup
==================================================

=== Step 1: Create deploy user ===
✅ User 'deploy' created

=== Step 2: Setup SSH authentication ===
✅ SSH key configured for deploy user

=== Step 3: Configure sudo permissions ===
✅ Deploy user added to sudoers

=== Step 4: Transfer project ownership ===
Copying project from /root/lensroom/frontend...
✅ Copied .env.local
✅ Project copied to /home/deploy/lensroom/frontend
Old location: /root/lensroom/frontend
New location: /home/deploy/lensroom/frontend

=== Step 5: Setup Node.js & PM2 for deploy user ===
✅ Node.js found: v18.x.x
✅ Added npm global bin to PATH
Installing PM2 for deploy user...
✅ PM2 installed for deploy user

=== Step 6: Handle existing PM2 processes ===
Stopping PM2 processes running as root...
✅ Stopped old PM2 processes

=== Step 7: Start application as deploy user ===
Starting application as deploy user...
✅ Application started
┌─────┬──────────┬─────────┬───────┬────────┐
│ id  │ name     │ mode    │ ↺     │ status │
├─────┼──────────┼─────────┼───────┼────────┤
│ 0   │ lensroom │ fork    │ 0     │ online │
└─────┴──────────┴─────────┴───────┴────────┘

==================================================
✅ Deploy User Setup Complete!
==================================================

Test SSH connection (from your local machine):
  ssh -i ~/.ssh/lensroom_deploy deploy@104.222.177.29
```

---

### **STEP 4: Test SSH Connection**

```bash
# From local machine
ssh -i ~/.ssh/lensroom_deploy deploy@104.222.177.29

# Expected: Login WITHOUT password!
# You should see:
# Welcome to Ubuntu 24.04 LTS
# deploy@server:~$
```

✅ **Success!** You're now logged in as `deploy` user!

```bash
# Test commands
whoami
# Output: deploy

pwd
# Output: /home/deploy

ls -la lensroom/frontend
# Should show project files

pm2 status
# Should show lensroom running
```

---

### **STEP 5: Configure SSH Config (Optional but Recommended)**

```bash
# On local machine
nano ~/.ssh/config
```

Add this:

```
Host lensroom
    HostName 104.222.177.29
    User deploy
    IdentityFile ~/.ssh/lensroom_deploy
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Save (Ctrl+O, Enter, Ctrl+X)

**Now you can connect with just:**

```bash
ssh lensroom  # That's it!
```

---

### **STEP 6: Test Deployment**

```bash
# From local machine
cd ~/Desktop/LensRoom.V2/lensroom-v2

# Make deploy script executable
chmod +x deploy-simple.sh

# Run deployment
./deploy-simple.sh
```

**Expected Output:**

```
==================================================
🚀 LensRoom - Simple Deployment
==================================================

Connecting to server...

📁 Navigating to project...
📥 Pulling latest code...
Already up to date.

📦 Installing dependencies...
up to date, audited 500 packages in 2s

🔨 Building application...
✓ Compiled successfully in 45.2s

🔄 Restarting PM2...
[PM2] Restarting lensroom
[PM2] ✓ lensroom

📊 PM2 Status:
┌─────┬──────────┬─────────┬───────┬────────┐
│ id  │ name     │ mode    │ ↺     │ status │
├─────┼──────────┼─────────┼───────┼────────┤
│ 0   │ lensroom │ fork    │ 5     │ online │
└─────┴──────────┴─────────┴───────┴────────┘

==================================================
✅ Deployment Successful!
==================================================
```

---

### **STEP 7: Disable Root Password Login (Optional)**

⚠️ **Do this ONLY after confirming deploy user works!**

```bash
# SSH to server as deploy user
ssh lensroom

# Copy security script
sudo cp ~/lensroom/frontend/disable-root-password.sh /tmp/

# Run it
sudo bash /tmp/disable-root-password.sh

# When prompted, type: yes
```

**What this does:**
- ❌ Disables password authentication
- ❌ Prevents root login with password
- ✅ Only allows SSH key authentication

**To revert (if needed):**
```bash
sudo cp /etc/ssh/sshd_config.backup.* /etc/ssh/sshd_config
sudo systemctl restart ssh
```

---

## ✅ **Verification Checklist**

After setup, verify everything works:

- [ ] SSH with deploy user (no password): `ssh lensroom`
- [ ] Project directory exists: `ls ~/lensroom/frontend`
- [ ] PM2 running as deploy: `pm2 status`
- [ ] Application accessible: `curl http://localhost:3000/api/health`
- [ ] Website works: `https://lensroom.ru`
- [ ] Deployment script works: `./deploy-simple.sh`
- [ ] Logs accessible: `pm2 logs lensroom`

---

## 🚀 **Daily Deployment (After Setup)**

### **One-Line Deploy**

```bash
./deploy-simple.sh
```

That's it! ✅

### **Or Manual Commands**

```bash
ssh lensroom
cd ~/lensroom/frontend
git pull && npm install && npm run build && pm2 restart lensroom
```

### **View Logs**

```bash
ssh lensroom
pm2 logs lensroom
```

---

## 📊 **Common Commands**

### **Connect to Server**
```bash
ssh lensroom
```

### **Deploy Updates**
```bash
./deploy-simple.sh
```

### **View Logs**
```bash
ssh lensroom "pm2 logs lensroom --lines 50"
```

### **Check Status**
```bash
ssh lensroom "pm2 status"
```

### **Restart Application**
```bash
ssh lensroom "pm2 restart lensroom"
```

### **Full Rebuild**
```bash
ssh lensroom << 'EOF'
cd ~/lensroom/frontend
rm -rf .next node_modules/.cache
npm install
npm run build
pm2 restart lensroom
EOF
```

---

## 🐛 **Troubleshooting**

### **Problem: SSH Key Permission Denied**

```bash
# Check key permissions
ls -la ~/.ssh/lensroom_deploy
# Should be: -rw-------

# Fix permissions
chmod 600 ~/.ssh/lensroom_deploy

# Try again
ssh -i ~/.ssh/lensroom_deploy deploy@104.222.177.29
```

### **Problem: "deploy user not found"**

```bash
# Setup script didn't run
# Re-run setup script on server:
ssh root@104.222.177.29
sudo bash /tmp/setup-deploy-user.sh
```

### **Problem: PM2 not found for deploy user**

```bash
ssh deploy@104.222.177.29

# Check PATH
echo $PATH
# Should include: /home/deploy/.npm-global/bin

# If not, add to .bashrc:
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Install PM2
npm install -g pm2
```

### **Problem: Project files not accessible**

```bash
ssh deploy@104.222.177.29

# Check ownership
ls -la ~/lensroom/frontend

# Should show: deploy deploy

# If not:
sudo chown -R deploy:deploy ~/lensroom
```

### **Problem: Can't restart PM2**

```bash
ssh lensroom

# Check PM2 status
pm2 status

# If no processes:
cd ~/lensroom/frontend
pm2 start npm --name "lensroom" -- start
pm2 save

# If process exists but won't restart:
pm2 delete lensroom
pm2 start npm --name "lensroom" -- start
pm2 save
```

---

## 🔒 **Security Improvements**

### **What Changed**

| Before | After |
|---|---|
| ❌ Root user | ✅ Deploy user |
| ❌ Password auth | ✅ SSH key only |
| ❌ Full root access | ✅ Limited sudo |
| ❌ Password in scripts | ✅ Key-based auth |
| ❌ Manual deployment | ✅ Automated script |

### **Benefits**

- ✅ No more "Connection closed" errors
- ✅ No more password in commands
- ✅ No more lockouts from failed attempts
- ✅ Proper user isolation
- ✅ Audit trail (who deployed what)
- ✅ Easy to revoke access (remove SSH key)

---

## 📚 **Files Created**

| File | Purpose |
|---|---|
| `setup-deploy-user.sh` | Server setup script |
| `disable-root-password.sh` | Disable password auth |
| `deploy-simple.sh` | One-command deployment |
| `SECURE_DEPLOYMENT_GUIDE.md` | This guide |

---

## 🎯 **Summary**

### **Before**
```bash
# Manual, insecure
ssh root@104.222.177.29  # Enter password
cd /root/lensroom/frontend
git pull
npm install
npm run build
pm2 restart lensroom
```

### **After**
```bash
# Automated, secure
./deploy-simple.sh  # Done! ✅
```

---

## ✅ **You're Done!**

**What works now:**
- ✅ Secure SSH with keys
- ✅ Dedicated deploy user
- ✅ One-command deployment
- ✅ No more passwords
- ✅ Proper permissions

**Next deployment:**
```bash
./deploy-simple.sh
```

**That's it!** 🎉

---

## 🆘 **Need Help?**

1. **Can't SSH?** → Check STEP 4
2. **PM2 not working?** → Check Troubleshooting
3. **Deployment fails?** → Check logs: `ssh lensroom "pm2 logs lensroom --err"`

**Still issues?** Run diagnostic:
```bash
ssh lensroom << 'EOF'
echo "=== USER ==="
whoami
echo ""
echo "=== PROJECT ==="
ls -la ~/lensroom/frontend
echo ""
echo "=== PM2 ==="
pm2 status
echo ""
echo "=== NODE ==="
node -v
npm -v
pm2 -v
EOF
```

Good luck! 🚀
