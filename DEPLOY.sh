#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════
#  🚀 LENSROOM.RU DEPLOY SCRIPT (SERVER ONLY)
# ═══════════════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

cd "$(dirname "$0")"

is_interactive() {
  [[ -t 0 && -t 1 ]]
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 LensRoom deploy to primary server (PM2)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${CYAN}Target SSH profile: ~/.ssh/config_lensroom (Host lensroom)${NC}\n"

if ! git diff-index --quiet HEAD --; then
  echo -e "${YELLOW}Found uncommitted changes:${NC}"
  git status --short
  echo ""
  if is_interactive; then
    read -p "Create commit before deploy? (Y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
      git add -A
      COMMIT_MSG="deploy: $(date '+%Y-%m-%d %H:%M')"
      git commit -m "$COMMIT_MSG" || true
      echo -e "${GREEN}✓ Commit step complete${NC}\n"
    fi
  else
    # Non-interactive mode (Codex/CI): do NOT auto-commit by default.
    # If you really want this, set DEPLOY_AUTOCOMMIT=1.
    if [[ "${DEPLOY_AUTOCOMMIT:-0}" == "1" ]]; then
      echo -e "${YELLOW}Non-interactive mode: auto-committing before deploy (DEPLOY_AUTOCOMMIT=1)...${NC}"
      git add -A
      COMMIT_MSG="deploy: $(date '+%Y-%m-%d %H:%M')"
      git commit -m "$COMMIT_MSG" || true
      echo -e "${GREEN}✓ Commit step complete${NC}\n"
    else
      echo -e "${RED}✗ Non-interactive mode detected and worktree is dirty.${NC}"
      echo -e "${YELLOW}  Either commit changes manually or set DEPLOY_AUTOCOMMIT=1 to auto-commit.${NC}"
      exit 1
    fi
  fi
fi

DEPLOY_PUSH="${DEPLOY_PUSH:-0}"
if is_interactive; then
  read -p "Push current branch to origin before deploy? (y/N): " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    BRANCH=$(git branch --show-current)
    git push origin "$BRANCH"
    echo -e "${GREEN}✓ Push complete${NC}\n"
  fi
else
  if [[ "$DEPLOY_PUSH" == "1" ]]; then
    BRANCH=$(git branch --show-current)
    echo -e "${YELLOW}Non-interactive mode: pushing $BRANCH to origin (DEPLOY_PUSH=1)...${NC}"
    git push origin "$BRANCH"
    echo -e "${GREEN}✓ Push complete${NC}\n"
  else
    echo -e "${YELLOW}Non-interactive mode: skipping push (set DEPLOY_PUSH=1 to enable).${NC}\n"
  fi
fi

bash ./deploy-direct.sh

echo -e "\n${GREEN}✅ Deployment complete${NC}"
echo -e "${CYAN}Site: https://lensroom.ru${NC}"

