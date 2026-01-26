# 🔍 Проверка: Сайт не открывается

## Быстрая диагностика (выполните на сервере)

```bash
# 1. SSH на сервер
ssh root@104.222.177.29

# 2. Проверка PM2
pm2 status

# 3. Проверка логов (последние 50 строк)
pm2 logs lensroom --lines 50

# 4. Проверка порта
netstat -tulpn | grep 3002

# 5. Проверка build
cd /opt/lensroom/lensroom-v2
ls -la .next
```

## Быстрое исправление

### Если PM2 не запущен:
```bash
cd /opt/lensroom/lensroom-v2
pm2 restart lensroom
```

### Если build отсутствует:
```bash
cd /opt/lensroom/lensroom-v2
npm run build
pm2 restart lensroom
```

### Если есть ошибки в логах:
1. Скопируйте ошибку из `pm2 logs lensroom`
2. Исправьте проблему
3. Пересоберите: `npm run build`
4. Перезапустите: `pm2 restart lensroom`

## Проверка последних изменений

Все последние изменения проверены на синтаксические ошибки:
- ✅ ImageGalleryMasonry - исправлена структура
- ✅ StudioWorkspaces - исправлен layout
- ✅ GeneratorBottomSheet - добавлена проверка canGenerate
- ✅ create/studio/page.tsx - добавлен Suspense

## Что проверить в логах

```bash
pm2 logs lensroom --lines 100 | grep -i error
```

Ищите:
- `SyntaxError`
- `ReferenceError`
- `TypeError`
- `Cannot find module`
- `Failed to compile`

## Если ничего не помогает

1. **Откат к предыдущей версии**:
```bash
cd /opt/lensroom/lensroom-v2
git log --oneline -5
git checkout <предыдущий-коммит>
npm run build
pm2 restart lensroom
```

2. **Полная пересборка**:
```bash
cd /opt/lensroom/lensroom-v2
rm -rf .next node_modules/.cache
npm ci
npm run build
pm2 restart lensroom
```

---

**Пришлите логи PM2 для диагностики:**
```bash
pm2 logs lensroom --lines 200 > logs.txt
```
