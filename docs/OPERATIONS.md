# Operations, Observability & Maintenance Guide (OPERATIONS.md)

## 1. System Overview & Dependencies
- **Application**: Next.js App Router (TypeScript, Node.js v20+)
- **Database**: PostgreSQL (Prisma ORM, Neon or Supabase)
- **Cache & Rate Limiting**: Upstash Redis (or in-memory sliding window fallback)
- **Blockchain**: Avalanche C-Chain RPC nodes (Fuji testnet `43113`, Mainnet `43114`)
  - Server-only backend RPC: `FUJI_RPC_URL`, `MAINNET_RPC_URL` (never bundled to browser; fallback to `deployments.json`)
  - Client public RPC: `NEXT_PUBLIC_FUJI_RPC_URL`, `NEXT_PUBLIC_MAINNET_RPC_URL` (public rate-limited RPCs only)
- **Monitoring & Logging**: Sentry (error tracking), privacy-respecting analytics
- **Cron Jobs**: Vercel Cron for payment reconciliation (`/api/cron/reconcile`)

---

## 2. Health Checks & Monitoring
- **Health Endpoint**: `GET /api/health`
  - Validates DB connectivity via `prisma.$queryRaw`
  - Validates RPC connectivity by checking `eth_blockNumber`
  - Returns JSON with system status, active network, and latency.
- **Sentry Error Monitoring**:
  - Implementation Status: PII scrubber implemented; error monitoring is NOT active yet (no Sentry.init).
  - Activation: Set `SENTRY_DSN` (server runtime) and `NEXT_PUBLIC_SENTRY_DSN` (client runtime). When either is unset or blank, error reporting is completely disabled (strict no-op).
  - PII Scrubbing Rules:
    - Strips all request bodies (`request.data`).
    - Strips all cookie headers and `request.cookies`.
    - Strips `Authorization` and `X-Api-Key` headers.
    - Strips query strings on `/pay/*` routes.
    - Strips wallet signature fields (`signature`, `sig`, `message`, `signTypedData`).
    - Redacts RPC URLs containing embedded API keys (`alchemy.com/v2/...`, `infura.io/v3/...`, etc.).
    - Strictly sets `sendDefaultPii: false`.
  - Bundle Size Isolation Note: Full `@sentry/nextjs` automatic wrapper is intentionally omitted from the root next config to avoid injecting client-side telemetry bundles onto public pages (`/`, `/about/how-it-works`, `/security`, `/legal/*`), preserving the Lighthouse 95+ performance budget achieved in Phase 6.1.
- **Content Security Policy (CSP)**:
  - Report-Only, includes 'unsafe-eval'/'unsafe-inline'; not yet enforcing.
- **Dependency Audit Status**:
  - Output summary: 25 total vulnerabilities (3 high in the prisma CLI chain, 22 moderate in the wallet stack).
  - `npm audit fix --force` would downgrade prisma, so it was NOT run.
  - Runtime reachability: The 3 high prisma CLI findings are verified not reachable at runtime in our code; the 22 moderate wallet stack findings are not verified.

---

## 3. Database Maintenance & Backups
- **Migrations**: Execute `npx prisma migrate deploy` in CI/CD pipeline before traffic routing.
- **Backups**:
  - Neon / Supabase point-in-time recovery (PITR) enabled.
  - Nightly encrypted database snapshots exported to isolated object storage.
- **Data Retention & Privacy**:
  - Merchants can trigger complete deletion of their account and all invoices via `/api/app/merchant/delete`.
  - Append-only audit logs are retained for security auditing.

---

## 4. Background Payment Reconciliation
- **Route**: `POST /api/cron/reconcile` (authenticated via `CRON_SECRET` bearer header).
- **Behavior**:
  - Queries `PaymentRouter` contract event logs (`Paid`) for the previous 500 blocks.
  - Looks up pending/sent invoices matching the on-chain `invoiceId`.
  - Verifies event parameters and marks invoices `PAID` if the user's browser dropped connection before sending the verification request.
  - Handles reorg safeguards by querying confirmed block heights.

---

## 5. Incident Response Playbook
- **Suspected Contract Anomaly**:
  - Since the contract never holds funds and is non-custodial, no funds are at risk of being locked or stolen from the contract itself.
  - The frontend can be switched to maintenance mode or have specific pay links disabled via `NEXT_PUBLIC_MAINTENANCE_MODE=true`.
- **RPC Outage**:
  - Fallback RPC URLs configured in `src/config/network.ts`.
- **Database Failover**:
  - Connection pooling configured via Prisma with PgBouncer connection strings.

---

## 6. Build & Development Server Isolation Rules
- **CRITICAL CONCURRENCY HAZARD**: Never run `npm run build` or start a second dev server while `npm run dev` is running.
- **Root Cause**: Next.js shares the local `.next` artifact/cache directory between dev and build commands. Running `next build` concurrently corrupts compiler manifests, route chunks, and asset mappings in `.next`, which breaks the active dev server.
- **Rule**: Before running `npm run build`, always stop any active `npm run dev` server (or specify a separate build directory).

