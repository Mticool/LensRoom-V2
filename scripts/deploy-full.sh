#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Полный деплой LensRoom (включая Lip Sync)
# ═══════════════════════════════════════════════════════════════════════════
#
# Использование:
#   cd lensroom-v2 && bash scripts/deploy-full.sh
#
# Шаги:
#   1. Type-check
#   2. Build
#   3. Напоминание про миграцию БД (Lip Sync)
#   4. Деплой на Vercel (--prod)
# ═══════════════════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🚀 ПОЛНЫЙ ДЕПЛОЙ LENSROOM (Lip Sync включён)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}📁 Каталог: $PROJECT_DIR${NC}"
echo ""

# ─── Step 1: Type check ───
echo -e "${YELLOW}▶ Step 1: TypeScript type-check...${NC}"
if npm run type-check 2>/dev/null; then
  echo -e "${GREEN}✓ Type-check OK${NC}"
else
  echo -e "${RED}✗ Type-check failed${NC}"
  exit 1
fi
echo ""

# ─── Step 2: Build ───
echo -e "${YELLOW}▶ Step 2: Next.js build...${NC}"
npm run build
echo -e "${GREEN}✓ Build OK${NC}"
echo ""

# ─── Step 3: Миграция БД (напоминание) ───
echo -e "${YELLOW}▶ Step 3: Миграция БД (Lip Sync)${NC}"
echo -e "${CYAN}Если миграция 20260129_lipsync_support.sql ещё не применена:${NC}"
echo -e "  1. Откройте Supabase Dashboard → SQL Editor"
echo -e "  2. Выполните файл: ${GREEN}supabase/migrations/20260129_lipsync_support.sql${NC}"
echo ""
read -p "Миграция уже применена? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}⚠ Примените миграцию в Supabase, затем запустите деплой снова.${NC}"
  echo -e "  Или продолжить деплой без миграции? (y/N): "
  read -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 0
  fi
fi
echo ""

# ─── Step 4: Vercel deploy ───
echo -e "${YELLOW}▶ Step 4: Vercel production deploy...${NC}"
if ! command -v vercel &>/dev/null; then
  echo -e "${YELLOW}Vercel CLI не найден. Установка: npm i -g vercel${NC}"
  npm install -g vercel
fi

if vercel --prod --yes; then
  echo -e "${GREEN}✓ Vercel deploy OK${NC}"
else
  echo -e "${RED}✗ Vercel deploy failed${NC}"
  exit 1
fi
echo ""

# ─── Готово ───
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ ПОЛНЫЙ ДЕПЛОЙ ЗАВЕРШЁН${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}Проверьте:${NC}"
echo -e "  • Сайт: ${GREEN}https://lensroom.ru${NC}"
echo -e "  • Озвучка: ${GREEN}https://lensroom.ru/create/studio?section=voice${NC}"
echo ""
echo -e "${CYAN}Переменные окружения на Vercel (если ещё не заданы):${NC}"
echo -e "  KIE_API_KEY, KIE_CALLBACK_SECRET, KIE_CALLBACK_URL"
echo ""
