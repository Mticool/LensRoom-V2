## Release checklist (LensRoom)

### 0) Preconditions
- **DB migrations applied**: up to `016_admin_analytics_indexes.sql` (and all earlier schema migrations).
- **Env configured**: copy `.env.example` → `.env.local` (local) / set env vars in Vercel.
- **Build clean**: `npm run build` проходит без ошибок.

### 1) Studio — фото (critical path)
- **Generate**: открыть `/create/studio?kind=photo`
  - выбрать модель фото
  - ввести промпт
  - нажать **"Сгенерировать • N ⭐"**
- **Expected**:
  - статус в UI: `queued → generating → success`
  - в БД появилась запись в `generations` со статусом `queued/generating/success`
  - **списание ⭐**: запись в `credit_transactions` (или эквивалент) + уменьшение `credits.amount`
  - результат виден в превью (GeneratorPreview)
- **Library**: открыть `/library`
  - запись появляется в первых 24
  - превью картинки открывается (modal)

### 2) Studio — видео (critical path)
- **Generate**: открыть `/create/studio?kind=video`
  - выбрать видео модель
  - промпт
  - генерация
- **Expected**:
  - списание ⭐ аналогично фото
  - результат попадает в `/library`
  - в viewer видео: `<video controls playsInline preload="metadata">` воспроизводится

### 3) Pricing consistency (no mismatch)
- `/pricing`:
  - 3 тарифа + 4 пакета ⭐ (включая 4990₽)
  - **⭐ и бонусы** считаются из `src/config/pricing.ts`
  - нет «разнобоя» цен в UI/кнопках генерации

### 4) Telegram auth
- `/` → открыть Login
- **Login** через Telegram
- **Expected**:
  - cookie `lr_session` установлена
  - `/profile` и `/library` открываются без редиректов
  - logout (если есть) очищает cookie

### 5) Admin + security
- `/admin`:
  - **не-admin**: редирект на `/`
  - **admin**: доступ к `/admin`, `/admin/sales`, `/admin/users`, `/admin/referrals`
- API:
  - `GET /api/admin/overview|sales|users|referrals` возвращают 200 для admin и 403/redirect flow для не-admin
- RLS sanity:
  - из клиента/anon key нельзя читать `payments`/`credit_transactions` других пользователей
  - user видит только свои `generations`

### 6) Telegram WebView / Mobile UX
- В Telegram WebView:
  - `/library` открывает результат через **"Открыть в браузере"** (openExternal)
- Mobile:
  - Studio: **Модели** открываются в bottom sheet
  - BottomActionBar не перекрывает контент и остаётся видимым
  - Нет заметных infinite re-render (CPU не скачет), нет console spam

### 7) Smoke commands (local)
```bash
npm ci
npm run build
npm run start
```

### 8) Rollback plan (minimum)
- Vercel: rollback до предыдущего deployment.
- DB: миграции 015/016 безопасны (idempotent), но для отката нужен manual rollback (drop policies/indexes) — только при крайней необходимости.

