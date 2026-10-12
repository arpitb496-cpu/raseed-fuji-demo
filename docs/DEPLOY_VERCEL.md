# Vercel Deployment & Operational Guide

## 1. Vercel Cron Jobs & Reconciliation

### Plan Schedules and Execution Model
- **Vercel Hobby Plan**:
  - Vercel platform specification allows cron jobs to trigger at most **once per day**. Expressions more frequent than once per day will cause deployments to fail with a build error.
  - The configured schedule in `vercel.json` is set to daily at 03:00 UTC:
    ```json
    {
      "path": "/api/cron/reconcile",
      "schedule": "0 3 * * *"
    }
    ```
  - Execution precision on Hobby is coarse (~1 hour window).
  - Consequently, on Hobby deployments, invoice settlement does **not** rely on the cron for real-time updates. Real-time settlement is driven directly by the customer pay page (`/pay/[publicId]`), which reports transaction hashes to `/api/pay/[publicId]/report` and polls `/api/invoices/[id]` for confirmation progression and settlement.
- **Vercel Pro Plan**:
  - Pro plans support schedules as frequent as every minute.
  - For Pro environments, `vercel.json` can be configured for every 5 minutes:
    ```json
    {
      "path": "/api/cron/reconcile",
      "schedule": "*/5 * * * *"
    }
    ```

### Manual Cron Trigger Command
To manually run the reconciliation engine without waiting for the scheduled cron run, issue an authorized HTTP request using `CRON_SECRET` loaded directly from your environment variable:

```bash
curl -X POST "https://<your-vercel-domain>/api/cron/reconcile" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

*(Note: Never hardcode or paste secret values in commands or terminal history. Always reference `${CRON_SECRET}` via the active shell environment).*

---

## 2. Vercel Production Checklist

### Environment Variables for Production AND Preview
The following environment variable names must be configured in your Vercel Project Settings under **Environment Variables** (configured for both **Production** and **Preview** scopes):

- `SESSION_SECRET`
- `CRON_SECRET`
- `DATABASE_URL` (and `DIRECT_URL` if direct connection is used for migrations)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `NEXT_PUBLIC_APP_URL` (and `APP_BASE_URL` if needed)
- `NEXT_PUBLIC_NETWORK=fuji`
- `DEMO_INVITE_MODE=true`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `FUJI_RPC_URL` (optional, for higher-throughput private RPC endpoints)
- `CONFIRMATIONS` (optional, default 3)

### Build-Time Embedding of Public Variables
Variables prefixed with `NEXT_PUBLIC_*` (such as `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_NETWORK`, and `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`) are inlined into the client-side JavaScript bundle at **BUILD time**. They must be set in the Vercel dashboard **before** triggering the initial build. Changing any `NEXT_PUBLIC_*` variable requires a full project redeployment to take effect in the browser.

### Generating High-Entropy Secrets Locally
Generate secrets locally using OpenSSL in your terminal and copy them directly into the Vercel Project Settings. Never commit, paste, or print these secret values into chat, repositories, or documentation:

```bash
# Generate SESSION_SECRET (48 bytes base64)
openssl rand -base64 48

# Generate CRON_SECRET (48 bytes base64)
openssl rand -base64 48
```

### One-Time Database Migration Step
Before directing users to the deployed site, apply committed Prisma schema migrations against the production PostgreSQL instance directly from your local development machine. Keep the production connection string confined strictly to the shell environment of that single command:

```bash
DATABASE_URL="<your-production-db-connection-string>" npx prisma migrate deploy
```
*(If connection pooling is active with a direct migration endpoint, provide `DIRECT_URL` alongside `DATABASE_URL` in the same command).*
