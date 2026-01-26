# 🚨 Экстренное исправление: Сайт не открывается

## Быстрое решение

### Вариант 1: Перезапуск PM2 (самое простое)

```bash
# На сервере
ssh root@104.222.177.29
cd /opt/lensroom/lensroom-v2
pm2 restart lensroom
pm2 logs lensroom --lines 50
```

### Вариант 2: Полная пересборка

```bash
# На сервере
cd /opt/lensroom/lensroom-v2
rm -rf .next node_modules/.cache
npm ci
npm run build
pm2 restart lensroom
```

### Вариант 3: Проверка и исправление ошибок

```bash
# 1. Проверка логов
pm2 logs lensroom --lines 100

# 2. Если есть ошибки TypeScript - проверка
cd /opt/lensroom/lensroom-v2
npm run type-check

# 3. Если build не проходит
npm run build 2>&1 | tee build.log

# 4. Проверка build.log на ошибки
cat build.log | grep -i error
```

## Возможные причины

### 1. Ошибка в коде
**Симптомы**: Ошибки в логах PM2

**Решение**: 
- Проверьте логи: `pm2 logs lensroom --lines 100`
- Найдите ошибку
- Исправьте код
- Пересоберите: `npm run build`
- Перезапустите: `pm2 restart lensroom`

### 2. PM2 процесс упал
**Симптомы**: `pm2 status` показывает stopped

**Решение**:
```bash
pm2 restart lensroom
# или
pm2 delete lensroom
cd /opt/lensroom/lensroom-v2
pm2 start npm --name "lensroom" -- start
```

### 3. Порт занят
**Симптомы**: Ошибка "Port 3002 already in use"

**Решение**:
```bash
lsof -i :3002
kill -9 <PID>
pm2 restart lensroom
```

### 4. Проблемы с зависимостями
**Симптомы**: Ошибки при запуске, модули не найдены

**Решение**:
```bash
cd /opt/lensroom/lensroom-v2
rm -rf node_modules
npm ci
npm run build
pm2 restart lensroom
```

### 5. Проблемы с Nginx
**Симптомы**: PM2 работает, но сайт не открывается

**Решение**:
```bash
nginx -t
systemctl reload nginx
systemctl status nginx
```

## Проверка работоспособности

```bash
# 1. Проверка PM2
pm2 status

# 2. Проверка порта
curl http://localhost:3002

# 3. Проверка логов
pm2 logs lensroom --lines 20

# 4. Проверка Nginx
curl -I https://lensroom.ru
```

## Откат изменений (если нужно)

```bash
cd /opt/lensroom/lensroom-v2
git log --oneline -10
git checkout <commit-hash>  # Откат к предыдущему рабочему коммиту
npm run build
pm2 restart lensroom
```

---

**Если ничего не помогает, пришлите:**
1. Логи PM2: `pm2 logs lensroom --lines 200`
2. Результат build: `npm run build 2>&1`
3. Статус PM2: `pm2 status`
4. Ошибки из консоли браузера (F12)
