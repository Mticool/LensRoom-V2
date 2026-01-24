# Auto-deploy через GitHub Actions (SSH → сервер → PM2)

Workflow: `.github/workflows/auto-deploy.yml`

## 1) GitHub Secrets (Settings → Secrets and variables → Actions)

Добавьте секреты:

- `DEPLOY_SSH_PRIVATE_KEY` — приватный SSH ключ (без passphrase), которым GitHub Actions будет заходить на сервер
- `DEPLOY_HOST` — хост (например: `lensroom.ru` или IP)
- `DEPLOY_USER` — пользователь (например: `root`)
- `DEPLOY_PATH` — путь к проекту на сервере (например: `/opt/lensroom/current`)
- `DEPLOY_PM2_APP_NAME` — имя PM2 процесса (например: `lensroom`) (опционально)

## 2) Сервер: разрешить SSH ключу деплоить

На сервере добавьте **public key** в `~/.ssh/authorized_keys` пользователя `DEPLOY_USER`.

## 3) Сервер: подготовить репозиторий

На сервере в `${DEPLOY_PATH}` должно быть:

- git-репо с настроенным `origin`
- файл `.env.local` (скрипт деплоя проверяет его наличие)
- установлен `node`, `npm`, `pm2`

Важно: деплой делает `git fetch origin` на сервере.
Если `origin` приватный, сервер должен иметь доступ (обычно через SSH deploy key или machine user key).

## 4) Запуск

- Автоматически: push в ветку `main`
- Вручную: вкладка Actions → `Auto Deploy (SSH + PM2)` → Run workflow

