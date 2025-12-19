## Telegram bot setup

### Required env

- `TELEGRAM_BOT_TOKEN`
- `SITE_URL` (e.g. `https://lensroom.ru`)

### Set webhook

Replace `<TOKEN>` and `<SITE_URL>`:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<SITE_URL>/api/telegram/webhook"
```

If you use a secret header:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<SITE_URL>/api/telegram/webhook&secret_token=<YOUR_SECRET>"
```

### Check webhook

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```


