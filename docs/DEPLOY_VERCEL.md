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
