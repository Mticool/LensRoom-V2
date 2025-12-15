#!/bin/bash
# ===============================================
# LensRoom - Disable Root Password Auth
# ===============================================
# Run AFTER verifying deploy user SSH works!
# This script disables password authentication
# ===============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=================================================="
echo "🔒 Disable Root Password Authentication"
echo "=================================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will disable password authentication!${NC}"
echo ""
echo "Before running this, make sure:"
echo "  1. ✅ Deploy user SSH key works"
echo "  2. ✅ You tested: ssh -i ~/.ssh/lensroom_deploy deploy@104.222.177.29"
echo "  3. ✅ You have another terminal with root access (backup!)"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Backing up SSH config..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%Y%m%d_%H%M%S)
echo -e "${GREEN}✅ Backup created${NC}"

echo ""
echo "Updating SSH configuration..."

# Update SSH config
sed -i 's/^#*PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#*PubkeyAuthentication no/PubkeyAuthentication yes/' /etc/ssh/sshd_config

# Ensure these lines exist
grep -q "^PasswordAuthentication" /etc/ssh/sshd_config || echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
grep -q "^PubkeyAuthentication" /etc/ssh/sshd_config || echo "PubkeyAuthentication yes" >> /etc/ssh/sshd_config

echo -e "${GREEN}✅ Configuration updated${NC}"

echo ""
echo "Testing SSH configuration..."
sshd -t

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSH configuration is valid${NC}"
    
    echo ""
    echo "Restarting SSH service..."
    systemctl restart ssh
    
    echo -e "${GREEN}✅ SSH service restarted${NC}"
    
    echo ""
    echo "=================================================="
    echo -e "${GREEN}✅ Password authentication disabled!${NC}"
    echo "=================================================="
    echo ""
    echo "From now on:"
    echo "  ✅ SSH key authentication only"
    echo "  ❌ Password login disabled"
    echo ""
    echo "To connect:"
    echo "  ssh -i ~/.ssh/lensroom_deploy deploy@104.222.177.29"
    echo ""
    echo "To revert (if needed):"
    echo "  1. Restore backup: cp /etc/ssh/sshd_config.backup.* /etc/ssh/sshd_config"
    echo "  2. Restart SSH: systemctl restart ssh"
    echo ""
else
    echo -e "${RED}❌ SSH configuration has errors!${NC}"
    echo "Restoring backup..."
    cp /etc/ssh/sshd_config.backup.* /etc/ssh/sshd_config
    echo "Aborted."
    exit 1
fi
