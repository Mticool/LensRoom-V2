#!/bin/bash
# =====================================================
# DEPLOY QUEUE SYSTEM
# Безопасный деплой системы очередей генерации
# =====================================================

set -e

echo "=========================================="
echo "DEPLOY: Generation Queue System"
echo "=========================================="
echo ""

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функции
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Проверка что мы на сервере
if [ ! -d "/opt/lensroom/current" ]; then
    log_error "Not on production server. Run this on lensroom.ru"
    exit 1
fi

cd /opt/lensroom/current

# =====================================================
# ШАГ 1: Применить миграцию
# =====================================================
log_info "Step 1: Applying database migration..."

# Загрузить переменные окружения
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
fi

# Применить миграцию через psql или supabase CLI
if [ -n "$DATABASE_URL" ]; then
    log_info "Applying migration via DATABASE_URL..."
    psql "$DATABASE_URL" -f supabase/migrations/20241228_generation_queue.sql
elif [ -n "$SUPABASE_DB_URL" ]; then
    log_info "Applying migration via SUPABASE_DB_URL..."
    psql "$SUPABASE_DB_URL" -f supabase/migrations/20241228_generation_queue.sql
else
    log_warn "No DATABASE_URL found, trying node script..."
    node scripts/apply-migration.mjs supabase/migrations/20241228_generation_queue.sql || true
fi

echo ""

# =====================================================
# ШАГ 2: Запустить тесты
# =====================================================
log_info "Step 2: Running tests..."

node scripts/test-generation-worker.js
TEST_RESULT=$?

if [ $TEST_RESULT -ne 0 ]; then
    log_error "Tests failed! Aborting deploy."
    exit 1
fi

log_info "Tests passed!"
echo ""

# =====================================================
# ШАГ 3: Пересобрать приложение
# =====================================================
log_info "Step 3: Building application..."

npm run build
BUILD_RESULT=$?

if [ $BUILD_RESULT -ne 0 ]; then
    log_error "Build failed! Aborting deploy."
    exit 1
fi

log_info "Build successful!"
echo ""

# =====================================================
# ШАГ 4: Перезапустить PM2
# =====================================================
log_info "Step 4: Restarting PM2 processes..."

# Остановить воркеры если они уже запущены
pm2 stop lensroom-gen-photo 2>/dev/null || true
pm2 stop lensroom-gen-video 2>/dev/null || true
pm2 delete lensroom-gen-photo 2>/dev/null || true
pm2 delete lensroom-gen-video 2>/dev/null || true

# Перезапустить всё через ecosystem
pm2 start ecosystem.config.js --update-env

# Сохранить конфигурацию
pm2 save

log_info "PM2 restarted!"
echo ""

# =====================================================
# ШАГ 5: Проверить статус
# =====================================================
log_info "Step 5: Checking status..."

sleep 3
pm2 status

echo ""
echo "=========================================="
echo "DEPLOY COMPLETE!"
echo "=========================================="
echo ""
log_info "Queue system deployed but NOT enabled yet."
log_info "To enable queue mode, add to .env.local:"
echo ""
echo "  USE_GENERATION_QUEUE=true"
echo ""
log_info "Then restart: pm2 restart lensroom"
echo ""
log_warn "Monitor logs: pm2 logs lensroom-gen-photo --lines 50"
log_warn "Monitor logs: pm2 logs lensroom-gen-video --lines 50"
echo ""

