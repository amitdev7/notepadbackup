# Zenithsui Production Deployment Guide

This guide details deploying **Zenithsui** to production environments, including cloud hosting on Vercel, self-hosted Docker deployments, and native desktop distribution.

---

## 1. Cloud Deployment (Vercel)

Zenithsui is optimized for zero-configuration deployment on **Vercel** with Next.js 16 (Turbopack):

### One-Click Deploy / Git Integration
1. Push your repository to GitHub: `https://github.com/<your-org>/notepadbackup`.
2. Import the project in the [Vercel Dashboard](https://vercel.com/new).
3. Vercel automatically detects the Next.js framework preset.
4. Set Build Command: `next build` (or leave as default `pnpm build`).
5. Configure Environment Variables in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL` *(optional)*
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` *(optional)*
   - `SUPABASE_SERVICE_ROLE_KEY` *(optional)*
   - `SHARE_SESSION_SECRET` *(recommended for cloud share sessions)*
   - `BLOB_READ_WRITE_TOKEN` *(optional, for Vercel Blob)*
6. Click **Deploy**.

### Automatic Domain Resolution
In `app/layout.tsx`, the site URL dynamically resolves:
```typescript
const defaultSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "https://zenithsui.sh");
```
When deployed on Vercel, canonical metadata and OpenGraph URLs configure automatically without manual intervention.

---

## 2. Self-Hosted Docker Deployment

For air-gapped, on-premise, or self-hosted environments:

### Using Docker Compose
```bash
docker compose -f docker-compose.zenithsui.yml up -d --build
```

### Production Hardening Flags
- Container runs as unprivileged user.
- Read-only filesystem with ephemeral `/tmp` cache mounts.
- Health checks configured against `http://localhost/` every 30 seconds.

---

## 3. Desktop Application Release Pipeline

Desktop distributions (Windows NSIS Setup & Standalone Portable) are automated via GitHub Actions:

### Triggering an Automated Release
1. Update version in `package.json` following Semantic Versioning (e.g., `0.1.1`).
2. Commit and create a Git release tag:
   ```bash
   git tag v0.1.1
   git push origin v0.1.1
   ```
3. GitHub Actions triggers `.github/workflows/desktop-release.yml`:
   - Runs `pnpm test` (all 37 suites).
   - Runs `pnpm tsc --noEmit` and `pnpm lint`.
   - Runs `pnpm desktop:build`.
   - Executes `electron-builder --win nsis portable --publish always`.
   - Publishes the GitHub Release with installers attached and generates auto-update metadata (`latest.yml`).

---

## 4. Production Health Monitoring

Zenithsui provides dedicated serverless health check endpoints:
- **Database Status**: `GET /api/db/status` returns database connectivity status, migration version, and latency.
- **Server Time & Calibration**: `GET /api/time` returns NTP-calibrated epoch timestamp and geo-IP approximation.
