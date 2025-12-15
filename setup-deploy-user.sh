#!/bin/bash
# ===============================================
# LensRoom - Setup Deploy User (Run on Server)
# ===============================================
# This script:
# 1. Creates deploy user
# 2. Sets up SSH key authentication
# 3. Configures sudo permissions
# 4. Transfers project ownership
# 5. Sets up PM2 for deploy user
# ===============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=================================================="
echo "🔐 LensRoom - Deploy User Setup"
echo "=================================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ This script must be run as root${NC}"
    echo "Usage: sudo bash setup-deploy-user.sh"
    exit 1
fi

# ===== STEP 1: Create Deploy User =====
echo -e "${BLUE}=== Step 1: Create deploy user ===${NC}"
if id "deploy" &>/dev/null; then
    echo -e "${YELLOW}⚠️  User 'deploy' already exists${NC}"
else
    useradd -m -s /bin/bash deploy
    echo -e "${GREEN}✅ User 'deploy' created${NC}"
fi
echo ""

# ===== STEP 2: Setup SSH =====
echo -e "${BLUE}=== Step 2: Setup SSH authentication ===${NC}"

# Create .ssh directory
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh

# Add public key (replace with your actual key)
cat > /home/deploy/.ssh/authorized_keys << 'SSHKEY'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOd5FExyo/lXcS8NloELYjQ6Jx2oPbnsJLvg6qqO7iSk deploy@lensroom.ru
SSHKEY

chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

echo -e "${GREEN}✅ SSH key configured for deploy user${NC}"
echo ""

# ===== STEP 3: Configure Sudo =====
echo -e "${BLUE}=== Step 3: Configure sudo permissions ===${NC}"

# Add deploy to sudoers with NOPASSWD
if [ ! -f /etc/sudoers.d/deploy ]; then
    echo "deploy ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/deploy
    chmod 440 /etc/sudoers.d/deploy
    echo -e "${GREEN}✅ Deploy user added to sudoers${NC}"
else
    echo -e "${YELLOW}⚠️  Sudoers entry already exists${NC}"
fi
echo ""

# ===== STEP 4: Transfer Project =====
echo -e "${BLUE}=== Step 4: Transfer project ownership ===${NC}"

# Create project directory for deploy user
mkdir -p /home/deploy/lensroom

# Check if old project exists
if [ -d "/root/lensroom/frontend" ]; then
    echo "Copying project from /root/lensroom/frontend..."
    
    # Copy project files
    cp -r /root/lensroom/frontend /home/deploy/lensroom/
    
    # Copy environment files
    if [ -f "/root/lensroom/frontend/.env.local" ]; then
        cp /root/lensroom/frontend/.env.local /home/deploy/lensroom/frontend/
        echo -e "${GREEN}✅ Copied .env.local${NC}"
    fi
    
    # Set ownership
    chown -R deploy:deploy /home/deploy/lensroom
    
    echo -e "${GREEN}✅ Project copied to /home/deploy/lensroom/frontend${NC}"
    echo "Old location: /root/lensroom/frontend"
    echo "New location: /home/deploy/lensroom/frontend"
else
    echo -e "${YELLOW}⚠️  Project not found at /root/lensroom/frontend${NC}"
    echo "Creating empty project directory..."
    mkdir -p /home/deploy/lensroom/frontend
    chown -R deploy:deploy /home/deploy/lensroom
fi
echo ""

# ===== STEP 5: Setup Node.js & PM2 =====
echo -e "${BLUE}=== Step 5: Setup Node.js & PM2 for deploy user ===${NC}"

# Check if Node.js is installed globally
if command -v node &> /dev/null; then
    echo -e "${GREEN}✅ Node.js found: $(node -v)${NC}"
    
    # Make npm global packages accessible to deploy user
    mkdir -p /home/deploy/.npm-global
    chown -R deploy:deploy /home/deploy/.npm-global
    
    # Configure npm for deploy user
    su - deploy -c "npm config set prefix '/home/deploy/.npm-global'"
    
    # Add to PATH in .bashrc
    if ! grep -q ".npm-global/bin" /home/deploy/.bashrc; then
        echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> /home/deploy/.bashrc
        echo -e "${GREEN}✅ Added npm global bin to PATH${NC}"
    fi
    
    # Install PM2 for deploy user
    echo "Installing PM2 for deploy user..."
    su - deploy -c "npm install -g pm2"
    
    echo -e "${GREEN}✅ PM2 installed for deploy user${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
    echo "Please install Node.js first:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -"
    echo "  apt-get install -y nodejs"
fi
echo ""

# ===== STEP 6: Stop Old PM2 Process =====
echo -e "${BLUE}=== Step 6: Handle existing PM2 processes ===${NC}"

# Check if PM2 is running as root
if pm2 list &> /dev/null; then
    echo "Stopping PM2 processes running as root..."
    pm2 stop lensroom || true
    pm2 delete lensroom || true
    echo -e "${GREEN}✅ Stopped old PM2 processes${NC}"
else
    echo "No PM2 processes running as root"
fi
echo ""

# ===== STEP 7: Start PM2 as Deploy User =====
echo -e "${BLUE}=== Step 7: Start application as deploy user ===${NC}"

if [ -d "/home/deploy/lensroom/frontend" ]; then
    echo "Starting application as deploy user..."
    
    su - deploy << 'DEPLOY_SCRIPT'
    cd /home/deploy/lensroom/frontend
    
    # Check if .next exists
    if [ ! -d ".next" ]; then
        echo "Building application..."
        npm install
        npm run build
    fi
    
    # Start with PM2
    pm2 start npm --name "lensroom" -- start
    pm2 save
    
    # Setup PM2 startup
    pm2 startup | grep -v "sudo" || true
    
    echo "✅ Application started"
    pm2 status
DEPLOY_SCRIPT
    
    echo -e "${GREEN}✅ Application running as deploy user${NC}"
else
    echo -e "${YELLOW}⚠️  Skipping PM2 start (project directory not ready)${NC}"
fi
echo ""

# ===== FINAL SUMMARY =====
echo "=================================================="
echo -e "${GREEN}✅ Deploy User Setup Complete!${NC}"
echo "=================================================="
echo ""
echo "📋 Summary:"
echo "  User created: deploy"
echo "  Home directory: /home/deploy"
echo "  Project location: /home/deploy/lensroom/frontend"
echo "  SSH key: configured"
echo "  Sudo: enabled (NOPASSWD)"
echo "  PM2: installed and configured"
echo ""
echo "🔐 Test SSH connection (from your local machine):"
echo "  ssh -i ~/.ssh/lensroom_deploy deploy@104.222.177.29"
echo ""
echo "🚀 Deploy command:"
echo "  ssh deploy@104.222.177.29 'cd ~/lensroom/frontend && git pull && npm install && npm run build && pm2 restart lensroom'"
echo ""
echo "=================================================="
