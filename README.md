## LensRoom V2

Next.js + TypeScript + Supabase + Telegram Bot

### Setup

```bash
npm ci
cp .env.example .env.local
# Fill .env.local with actual keys
npm run build
npm start
```

### Production Deploy

Server: `root@104.222.177.29`  
Path: `/opt/lensroom/lensroom-v2`  
Process: PM2 (ecosystem.config.js)  
Nginx: Port 3000 → HTTPS

```bash
# On server
pm2 status
pm2 logs lensroom
pm2 restart lensroom
```

### Migrations

Apply via Supabase Dashboard SQL Editor:
- `supabase/migrations/018_telegram_bot_features.sql`

### Telegram Bot

Set webhook after deploy:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://lensroom.ru/api/telegram/webhook&secret_token=<SECRET>"
```
