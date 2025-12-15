# 🔒 Security Setup Checklist

**Project**: LensRoom  
**Goal**: Secure deployment setup  
**Status**: Ready to execute

---

## ✅ **Pre-Setup Checklist**

- [x] SSH key generated locally (`~/.ssh/lensroom_deploy`)
- [x] Setup scripts created
- [ ] Backup server access (keep one root terminal open!)
- [ ] Tested scripts locally

---

## 📋 **Execution Checklist**

### **Phase 1: Setup Deploy User**
- [ ] Upload `setup-deploy-user.sh` to server
- [ ] SSH to server as root
- [ ] Run `sudo bash /tmp/setup-deploy-user.sh`
- [ ] Verify output: ✅ Deploy User Setup Complete
- [ ] Note new project location: `/home/deploy/lensroom/frontend`

### **Phase 2: Test Deploy Access**
- [ ] Test SSH: `ssh -i ~/.ssh/lensroom_deploy deploy@104.222.177.29`
- [ ] Verify login works (no password!)
- [ ] Check home directory: `ls -la ~`
- [ ] Check project: `ls -la ~/lensroom/frontend`
- [ ] Check PM2: `pm2 status`
- [ ] Verify lensroom is online
- [ ] Test website: `https://lensroom.ru`

### **Phase 3: Setup SSH Alias**
- [ ] Copy SSH config: `cat ssh-config-template.txt >> ~/.ssh/config`
- [ ] Test alias: `ssh lensroom`
- [ ] Should work without specifying key!

### **Phase 4: Test Deployment**
- [ ] Make script executable: `chmod +x deploy-simple.sh`
- [ ] Run deployment: `./deploy-simple.sh`
- [ ] Verify build succeeds
- [ ] Verify PM2 restarts
- [ ] Check website: `https://lensroom.ru`
- [ ] Check logs: `ssh lensroom "pm2 logs lensroom --lines 20"`

### **Phase 5: Disable Root Password (Optional)**
⚠️ **Do this ONLY after confirming deploy user works!**

- [ ] Keep one root SSH session open (backup!)
- [ ] Upload `disable-root-password.sh` to server
- [ ] Run: `sudo bash /tmp/disable-root-password.sh`
- [ ] Type `yes` when prompted
- [ ] Verify SSH still works: `ssh lensroom`
- [ ] Try root password login (should fail ✅)
- [ ] Close backup root session

---

## 🎯 **Success Criteria**

After setup, all of these should work:

### **SSH Access**
- [x] Connect without password: `ssh lensroom` ✅
- [x] Login as deploy user ✅
- [x] No password prompts ✅

### **Project Access**
- [ ] Project directory: `/home/deploy/lensroom/frontend` ✅
- [ ] All files present: `ls -la ~/lensroom/frontend` ✅
- [ ] Correct ownership: `deploy:deploy` ✅
- [ ] `.env.local` copied ✅

### **PM2**
- [ ] PM2 installed for deploy user ✅
- [ ] PM2 status shows lensroom ✅
- [ ] Lensroom status: online ✅
- [ ] Can restart: `pm2 restart lensroom` ✅

### **Application**
- [ ] Website loads: `https://lensroom.ru` ✅
- [ ] API works: `https://lensroom.ru/api/health` ✅
- [ ] No errors in logs ✅

### **Deployment**
- [ ] One-command deploy works: `./deploy-simple.sh` ✅
- [ ] Build succeeds ✅
- [ ] PM2 restarts ✅
- [ ] Website updates ✅

### **Security**
- [ ] SSH key authentication only ✅
- [ ] Password login disabled (optional) ⚪
- [ ] No root access needed ✅
- [ ] Sudo works for deploy user ✅

---

## 🔧 **Post-Setup Maintenance**

### **Regular Deployment**
```bash
./deploy-simple.sh
```

### **View Logs**
```bash
ssh lensroom "pm2 logs lensroom"
```

### **Restart Application**
```bash
ssh lensroom "pm2 restart lensroom"
```

### **Full Rebuild**
```bash
ssh lensroom << 'EOF'
cd ~/lensroom/frontend
rm -rf .next
npm install
npm run build
pm2 restart lensroom
EOF
```

---

## 📊 **Verification Commands**

### **Check Deploy User**
```bash
ssh lensroom "id"
# Output: uid=1001(deploy) gid=1001(deploy) groups=1001(deploy)
```

### **Check Project Ownership**
```bash
ssh lensroom "ls -la ~/lensroom/frontend | head -5"
# All files should be: deploy deploy
```

### **Check PM2 Status**
```bash
ssh lensroom "pm2 status"
# Should show: lensroom | online
```

### **Check Application**
```bash
curl https://lensroom.ru/api/health
# Output: {"status":"ok"}
```

### **Check Logs**
```bash
ssh lensroom "pm2 logs lensroom --lines 50 --nostream"
# Should show no errors
```

---

## 🐛 **Rollback Plan**

If something goes wrong:

### **Rollback 1: Keep Root Access**
```bash
# In backup root terminal (keep open during setup):
ssh root@104.222.177.29
# Don't close this!

# If deploy user doesn't work, you still have root access
```

### **Rollback 2: Restore Old PM2**
```bash
# SSH as root
ssh root@104.222.177.29

# Stop deploy user PM2
pm2 delete lensroom

# Start as root
cd /root/lensroom/frontend
pm2 start npm --name "lensroom" -- start
pm2 save
```

### **Rollback 3: Re-enable Password Auth**
```bash
# SSH as root (or deploy with sudo)
ssh root@104.222.177.29

# Restore SSH config
sudo cp /etc/ssh/sshd_config.backup.* /etc/ssh/sshd_config

# Restart SSH
sudo systemctl restart ssh

# Password login works again
```

---

## 📚 **Documentation**

| File | Purpose |
|---|---|
| `QUICK_START_SECURE.md` | 5-minute quick start |
| `SECURE_DEPLOYMENT_GUIDE.md` | Detailed guide |
| `setup-deploy-user.sh` | Server setup script |
| `disable-root-password.sh` | Disable password auth |
| `deploy-simple.sh` | Deployment script |
| `ssh-config-template.txt` | SSH config |

---

## ✅ **Final Checklist**

Before you start:
- [ ] Read `QUICK_START_SECURE.md`
- [ ] Backup current `.env.local`
- [ ] Keep one root SSH session open
- [ ] Have scripts ready

During setup:
- [ ] Run `setup-deploy-user.sh`
- [ ] Test deploy user SSH
- [ ] Test deployment
- [ ] Verify website works

After setup:
- [ ] Close root session
- [ ] Use deploy user only
- [ ] Deploy with `./deploy-simple.sh`
- [ ] Celebrate! 🎉

---

## 🎉 **Benefits**

### **Before**
- ❌ Root access everywhere
- ❌ Password in commands
- ❌ "Connection closed" errors
- ❌ Manual deployment
- ❌ Security risks

### **After**
- ✅ Dedicated deploy user
- ✅ SSH key authentication
- ✅ No connection issues
- ✅ One-command deployment
- ✅ Secure by default

---

**Ready to start?**

See: `QUICK_START_SECURE.md`

Good luck! 🚀
