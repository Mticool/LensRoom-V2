# ⚡ Quick Start - Secure Deployment

**Goal**: Setup secure deployment in 5 minutes  
**Current**: root + password ❌  
**Target**: deploy + SSH key ✅

---

## 🎯 **3 Steps to Secure Deployment**

### **STEP 1: Upload Script (Local Machine)**

```bash
cd ~/Desktop/LensRoom.V2/lensroom-v2

# Upload setup script
scp setup-deploy-user.sh root@104.222.177.29:/tmp/
# Password: EDJwxEBDqn5z (last time!)
```

---

### **STEP 2: Run Setup (On Server)**

```bash
# SSH to server
ssh root@104.222.177.29
# Password: EDJwxEBDqn5z

# Run setup
sudo bash /tmp/setup-deploy-user.sh

# Wait for:
# ✅ Deploy User Setup Complete!

# Exit
exit
```

---

### **STEP 3: Test (Local Machine)**

```bash
# Test SSH connection
ssh -i ~/.ssh/lensroom_deploy deploy@104.222.177.29

# Should login WITHOUT password! ✅

# Check PM2
pm2 status

# Should show lensroom online ✅

# Exit
exit
```

---

## ✅ **Done! Now Deploy**

```bash
cd ~/Desktop/LensRoom.V2/lensroom-v2

# Make script executable
chmod +x deploy-simple.sh

# Deploy!
./deploy-simple.sh
```

---

## 📋 **Setup SSH Alias (Optional)**

```bash
# Add SSH config
cat ssh-config-template.txt >> ~/.ssh/config

# Now connect with:
ssh lensroom  # That's it!
```

---

## 🚀 **Daily Usage**

### **Deploy Updates**
```bash
./deploy-simple.sh
```

### **View Logs**
```bash
ssh lensroom "pm2 logs lensroom"
```

### **Restart App**
```bash
ssh lensroom "pm2 restart lensroom"
```

---

## 🐛 **Troubleshooting**

### **Can't SSH?**
```bash
# Check key permissions
chmod 600 ~/.ssh/lensroom_deploy

# Try verbose
ssh -v -i ~/.ssh/lensroom_deploy deploy@104.222.177.29
```

### **Deploy user not found?**
```bash
# Re-run setup script
ssh root@104.222.177.29
sudo bash /tmp/setup-deploy-user.sh
```

### **PM2 not working?**
```bash
ssh deploy@104.222.177.29
pm2 status

# If empty:
cd ~/lensroom/frontend
pm2 start npm --name "lensroom" -- start
pm2 save
```

---

## 📚 **Full Documentation**

See `SECURE_DEPLOYMENT_GUIDE.md` for detailed guide.

---

## ✅ **What You Get**

- ✅ No more passwords
- ✅ No more root access
- ✅ One-command deployment
- ✅ Secure by default
- ✅ No more "Connection closed"

**Deploy now:**
```bash
./deploy-simple.sh
```

🎉 **Done!**
