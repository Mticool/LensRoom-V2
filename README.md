## LensRoom V2

AI Content Generation Platform — 12 лучших AI моделей для фото и видео.

**Stack:** Next.js 16 + TypeScript + Tailwind CSS 4 + Supabase + KIE.ai + Telegram Bot

---

### Quick Start

```bash
npm ci
cp .env.example .env.local
# Заполни .env.local актуальными ключами
npm run dev      # Development (http://localhost:3000)
```

### Build & Production

```bash
npm run build    # Сборка
npm start        # Запуск (http://localhost:3002)
```

---

### Project Structure

```
lensroom-v2/
├── src/
│   ├── app/              # Next.js App Router (pages + API routes)
│   │   ├── api/          # API endpoints
│   │   ├── admin/        # Admin panel
│   │   ├── create/       # Generator pages (photo, video, products)
│   │   └── ...
│   ├── components/       # React components
│   │   ├── ui/           # Base UI components
│   │   ├── studio/       # Generator studio components
│   │   └── ...
│   ├── config/           # Model configs, pricing, presets
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities, API clients, helpers
│   ├── providers/        # React Context providers
│   ├── stores/           # Zustand stores
│   └── types/            # TypeScript types
├── supabase/migrations/  # Database migrations
├── scripts/              # Deploy & maintenance scripts
├── public/               # Static assets
└── docs/                 # Documentation
```

---

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type check |
| `npm run worker:previews` | Preview generation worker |

---

### Production Deploy

**Server:** `root@104.222.177.29`  
**Path:** `/opt/lensroom/lensroom-v2`  
**Process:** PM2 (`ecosystem.config.js`)  
**Nginx:** Port 3000 → HTTPS

```bash
# На сервере
pm2 status
pm2 logs lensroom
pm2 restart lensroom
```

---

### Migrations

Применяй через Supabase Dashboard → SQL Editor:
- Все миграции в `supabase/migrations/`

---

### Telegram Bot

После деплоя установи webhook:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://lensroom.ru/api/telegram/webhook&secret_token=<SECRET>"
```

---

### Environment Variables

См. `.env.example` для полного списка.

Ключевые:
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `KIE_API_KEY` — KIE.ai API key
- `TELEGRAM_BOT_TOKEN` — Telegram bot token
