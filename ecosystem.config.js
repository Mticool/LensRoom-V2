/**
 * PM2 Ecosystem Config for LensRoom - INSTANT PREVIEWS VERSION
 *
 * Goals:
 * - Fixed cwd (single active release via /opt/lensroom/current)
 * - Load env from .env.local via env_file
 * - Start only if .next/BUILD_ID exists (via scripts/start-production.sh)
 * - Single instance to avoid Server Action mismatch across different builds
 * - Background worker for FAST preview generation (10s interval)
 * 
 * Deployment:
 *   pm2 start ecosystem.config.js --update-env
 *   pm2 save
 */

module.exports = {
  apps: [
    {
      // Main Next.js application
      name: "lensroom",
      cwd: "/opt/lensroom/current",
      script: "bash",
      args: "scripts/start-production.sh",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      kill_timeout: 30000,
      watch: false,
      env_file: "/opt/lensroom/current/.env.local",
      env: {
        NODE_ENV: "production",
        PORT: "3002",
      },
    },
    {
      // INSTANT PREVIEWS Worker
      // Polls every 10s, generates previews for success generations
      // Can be stopped: pm2 stop lensroom-previews-worker
      // Can disable via PREVIEWS_ENABLED=false in .env.local
      name: "lensroom-previews-worker",
      cwd: "/opt/lensroom/current",
      script: "node",
      args: "scripts/previews-worker.js",
      interpreter: "none",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000, // 5s delay between restarts
      watch: false,
      env_file: "/opt/lensroom/current/.env.local",
      env: {
        NODE_ENV: "production",
        PREVIEWS_WORKER_ENABLED: "true",
        PREVIEWS_WORKER_INTERVAL_MS: "10000", // 10 seconds for fast previews
        PREVIEWS_WORKER_CONCURRENCY: "2",
        PREVIEWS_WORKER_DEBUG: "false",
      },
    },
  ],
};

