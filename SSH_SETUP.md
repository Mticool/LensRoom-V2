# 🔐 SSH Key Setup Guide

**Goal**: Password-free deployment with SSH keys  
**Server**: root@104.222.177.29

---

## 📋 **Why SSH Keys?**

✅ **More Secure**: No password in commands/scripts  
✅ **Convenient**: No typing password every time  
✅ **Automation**: Enable CI/CD without exposing password  
✅ **Auditable**: Each key can have a different purpose

---

## 🔑 **Step 1: Generate SSH Key (Local Machine)**

```bash
# Generate new SSH key pair
ssh-keygen -t ed25519 -C "deploy@lensroom.ru" -f ~/.ssh/lensroom_deploy

# You'll see:
# Generating public/private ed25519 key pair.
# Enter passphrase (empty for no passphrase): [Press Enter]
# Enter same passphrase again: [Press Enter]

# Output:
# Your identification has been saved in ~/.ssh/lensroom_deploy
# Your public key has been saved in ~/.ssh/lensroom_deploy.pub
```

**Files created**:
- `~/.ssh/lensroom_deploy` - Private key (NEVER share!)
- `~/.ssh/lensroom_deploy.pub` - Public key (safe to share)

---

## 📤 **Step 2: Copy Public Key to Server**

### **Method A: Manual Copy (Recommended)**

```bash
# 1. View your public key
cat ~/.ssh/lensroom_deploy.pub

# Output (copy this entire line):
# ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFj... deploy@lensroom.ru

# 2. SSH to server (last time with password)
ssh root@104.222.177.29
# Password: EDJwxEBDqn5z

# 3. On server, add public key
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys

# 4. Paste your public key (from step 1)
# Save: Ctrl+O, Enter, Ctrl+X

# 5. Set correct permissions
chmod 600 ~/.ssh/authorized_keys

# 6. Exit server
exit
```

### **Method B: Using ssh-copy-id (If Available)**

```bash
# Copy key to server
ssh-copy-id -i ~/.ssh/lensroom_deploy.pub root@104.222.177.29

# Enter password: EDJwxEBDqn5z

# Done!
```

---

## ✅ **Step 3: Test SSH Key**

```bash
# Connect with key (no password!)
ssh -i ~/.ssh/lensroom_deploy root@104.222.177.29

# If successful, you're in without typing password!
# Output:
# Welcome to Ubuntu 24.04 LTS
# root@server:~#
```

**If it asks for password**:
- Check public key is in `~/.ssh/authorized_keys` on server
- Check permissions: `chmod 600 ~/.ssh/authorized_keys`
- Check private key permissions: `chmod 600 ~/.ssh/lensroom_deploy`

---

## 🔧 **Step 4: Configure SSH Config (Optional but Recommended)**

```bash
# On local machine
nano ~/.ssh/config
```

Add this:
```
Host lensroom
    HostName 104.222.177.29
    User root
    IdentityFile ~/.ssh/lensroom_deploy
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

Save (Ctrl+O, Enter, Ctrl+X)

**Now you can connect simply with**:
```bash
ssh lensroom  # Instead of ssh -i ~/.ssh/lensroom_deploy root@104.222.177.29
```

---

## 🛡️ **Step 5: Disable Password Authentication (Optional)**

⚠️ **WARNING**: Do this ONLY after confirming SSH key works!

```bash
# SSH to server
ssh lensroom

# Backup SSH config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Edit config
sudo nano /etc/ssh/sshd_config
```

Find and change these lines:
```
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin prohibit-password  # Or 'yes' if you need root with keys
ChallengeResponseAuthentication no
```

Save and exit.

```bash
# Test config
sudo sshd -t

# If OK, restart SSH
sudo systemctl restart ssh

# IMPORTANT: Don't close this session!
# Open a NEW terminal and test:
ssh lensroom

# If it works, you're good!
# If not, the old session is still open for fixing.
```

---

## 🔄 **Step 6: Use SSH Key in Deployment**

### **A. Manual Deployment**
```bash
# Connect
ssh lensroom

# Deploy
cd /root/lensroom/frontend
git pull
npm install
npm run build
pm2 restart lensroom
```

### **B. Automated Deployment Script**
```bash
# Local machine
nano deploy.sh
```

```bash
#!/bin/bash
# Deploy script with SSH key

ssh lensroom << 'EOF'
  cd /root/lensroom/frontend
  git pull origin main
  npm install
  npm run build
  pm2 restart lensroom
  pm2 status
EOF
```

```bash
chmod +x deploy.sh
./deploy.sh
```

### **C. One-Line Deploy**
```bash
ssh lensroom 'cd /root/lensroom/frontend && git pull && npm install && npm run build && pm2 restart lensroom'
```

---

## 🎯 **Step 7: Setup Deploy User (Optional, More Secure)**

Instead of using `root`, create a dedicated deploy user:

```bash
# SSH as root
ssh lensroom

# Create deploy user
sudo adduser deploy
# Set password (you won't use it, but required)

# Add to necessary groups
sudo usermod -aG sudo deploy

# Setup project directory
sudo chown -R deploy:deploy /root/lensroom/frontend
# Or move to: /home/deploy/lensroom/frontend

# Setup SSH for deploy user
sudo mkdir -p /home/deploy/.ssh
sudo nano /home/deploy/.ssh/authorized_keys
# Paste your public key
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh

# Test
exit
ssh deploy@104.222.177.29
# Should work!
```

Update SSH config:
```
Host lensroom
    HostName 104.222.177.29
    User deploy  # Changed from root
    IdentityFile ~/.ssh/lensroom_deploy
```

---

## 📊 **Verification Checklist**

- [ ] SSH key generated (`~/.ssh/lensroom_deploy`)
- [ ] Public key added to server (`~/.ssh/authorized_keys`)
- [ ] SSH works without password
- [ ] SSH config created (optional)
- [ ] Deployment script uses SSH key
- [ ] Password auth disabled (optional)
- [ ] Deploy user created (optional)

---

## 🐛 **Troubleshooting**

### **Problem: Still Asks for Password**

```bash
# Check key permissions
ls -la ~/.ssh/lensroom_deploy
# Should be: -rw------- (600)

chmod 600 ~/.ssh/lensroom_deploy

# Check server authorized_keys
ssh root@104.222.177.29  # With password
cat ~/.ssh/authorized_keys
# Should contain your public key
chmod 600 ~/.ssh/authorized_keys
```

### **Problem: Permission Denied (publickey)**

```bash
# Try with verbose mode
ssh -v -i ~/.ssh/lensroom_deploy root@104.222.177.29

# Look for:
# debug1: Offering public key: ~/.ssh/lensroom_deploy
# debug1: Authentications that can continue: publickey,password

# Common fixes:
# 1. Wrong private key
ssh-add ~/.ssh/lensroom_deploy

# 2. Server SSH config doesn't allow keys
# On server:
sudo nano /etc/ssh/sshd_config
# Set: PubkeyAuthentication yes
sudo systemctl restart ssh
```

### **Problem: Connection Timeout**

```bash
# Check firewall
ssh root@104.222.177.29  # With password
sudo ufw status

# Allow SSH
sudo ufw allow 22/tcp
sudo ufw enable
```

### **Problem: Key Not Found**

```bash
# Check SSH agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/lensroom_deploy

# List added keys
ssh-add -l
```

---

## 🔒 **Security Best Practices**

### **1. Protect Private Key**
```bash
# Private key should be readable only by you
chmod 600 ~/.ssh/lensroom_deploy

# Never commit to Git
echo "~/.ssh/*" >> ~/.gitignore
```

### **2. Use Passphrase (Optional)**
```bash
# Add passphrase to existing key
ssh-keygen -p -f ~/.ssh/lensroom_deploy

# Enter new passphrase
# (You'll need to enter it once per session, or use ssh-agent)
```

### **3. Rotate Keys Regularly**
```bash
# Generate new key every 6-12 months
ssh-keygen -t ed25519 -C "deploy@lensroom.ru-$(date +%Y%m)" -f ~/.ssh/lensroom_deploy_new

# Add new key to server
# Remove old key from server
# Update SSH config
```

### **4. Use Different Keys for Different Purposes**
```bash
~/.ssh/lensroom_deploy       # For deployment
~/.ssh/lensroom_admin        # For admin access
~/.ssh/lensroom_backup       # For backup scripts
```

---

## 📚 **Useful Commands**

```bash
# Connect to server
ssh lensroom

# Copy file to server
scp file.txt lensroom:/root/lensroom/frontend/

# Copy file from server
scp lensroom:/root/lensroom/frontend/logs.txt ./

# Run command on server
ssh lensroom 'pm2 status'

# Execute script on server
ssh lensroom < local-script.sh

# Port forwarding (access server's port 3000 locally)
ssh -L 3000:localhost:3000 lensroom
```

---

## ✅ **Success!**

You now have:
- ✅ Password-free SSH access
- ✅ Secure key-based authentication
- ✅ Easy deployment workflow
- ✅ Foundation for CI/CD automation

**Test deployment**:
```bash
ssh lensroom
cd /root/lensroom/frontend
./DEPLOY_COMMANDS.sh
```

**Next**: See `DEPLOYMENT_RUNBOOK.md` for full deployment guide
