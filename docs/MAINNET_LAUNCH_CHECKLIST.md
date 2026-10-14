# Avalanche Mainnet Launch Checklist (MAINNET_LAUNCH_CHECKLIST.md)

This checklist tracks requirements before flipping `NEXT_PUBLIC_NETWORK=mainnet` for public production use on Avalanche C-Chain.

---

## 1. Smart Contract Governance & Ownership
- [ ] **Contract Ownership Transfer**: Transfer `PaymentRouter` ownership to a multi-signature wallet (e.g., 3-of-5 multisig) on Avalanche C-Chain.
- [ ] Replace single-wallet owner with a multisig before mainnet.
- [ ] **Zero Dev Keys**: Verify that no deployer private key retains admin authority or fee withdrawal rights.
- [ ] **Fee Cap Verification**: Re-verify on-chain that `feeBps` is set to agreed initial rate (default `0`) and cannot exceed 100 bps (1%).
- [ ] **Snowtrace Verification**: Contract source code published and matched with pinned Solidity version `0.8.24` and exact compiler optimizations.

---

## 2. Independent Security Audits
- [ ] **Third-Party Smart Contract Audit**: Independent security firm audit of `PaymentRouter.sol`.
- [ ] **Slither & Static Analysis**: Zero open medium or high severity findings.
- [ ] **Web & API Penetration Test**: Independent review of SIWE implementation, session management, and rate limiting.

---

## 3. Legal, Compliance & Regulatory
- [ ] **Terms of Service**: Independent legal review of `Terms of Service` by qualified counsel in target jurisdictions (India & US).
- [ ] **Privacy Policy**: Legal review ensuring compliance with DPDP Act (India) and GDPR/CCPA.
- [ ] **Disclaimer Review**: Explicit verification that no copy makes claims of interest, yield, investment returns, or financial guarantees.
- [ ] **Tax Disclaimer**: Prominent placement of disclaimers noting that merchants are exclusively responsible for local tax and GST/VAT compliance.

---

## 4. Infrastructure & Production Hardening
- [ ] **Custom Domain & DNSSEC**: Custom domain configured with DNSSEC and Strict HTTPS (HSTS).
- [ ] **Production Database**: Dedicated high-availability PostgreSQL instance (Neon / Supabase) with automated PITR backups.
- [ ] **Upstash Redis**: Production rate limiting cluster with failover.
- [ ] **RPC Redundancy**: Multi-provider fallback RPC endpoints (e.g. Infura + Alchemy + public Avalanche C-Chain RPC).
- [ ] **Sentry Alerts & PagerDuty**: Error alerting and escalation rules configured.
- [ ] **Vercel Cron**: Scheduled payment reconciliation job active with random 32-byte `CRON_SECRET`.

---

## 5. Mainnet Dry Run & Smoke Testing
- [ ] **Deployment Script Guard**: Verify deploy script aborts unless explicit `CONFIRM_MAINNET_DEPLOY=true` flag is set.
- [ ] **Small-Value Real USDC Smoke Test**: Execute an end-to-end invoice creation, payment with 1 USDC on mainnet, server verification, PDF generation, and CSV export.
- [ ] **Incident Communication Plan**: Status page and communication channels established.
