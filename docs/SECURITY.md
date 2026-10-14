# Security Policy & Vulnerability Disclosure (SECURITY.md)

CryptoDao prioritizes the protection of self-custodial transactions. We welcome responsible security reports from researchers and the community.

CryptoDao is a project name. It is not a DAO and has no token or on-chain governance.

---

## 1. Scope
The following components are in scope:
- **Smart Contracts**: `PaymentRouter.sol` deployed on Avalanche Fuji & Mainnet.
- **Server Verification API**: `/api/invoices/[id]/verify` and `/api/cron/reconcile`.
- **Authentication**: Sign-In with Ethereum (SIWE) implementation and session security.
- **Data Access Layer**: Merchant authorization, IDOR protection, and rate limiting.

### Out of Scope
- Denial-of-service attacks requiring massive botnet volume.
- Social engineering, phishing, or physical attacks against employees or users.
- Third-party vulnerabilities in MetaMask, Core Wallet, or RPC providers (unless directly exploitable via our interface).

---

## 2. Reporting a Vulnerability
If you discover a security vulnerability, please submit your findings to:
- **Security Contact**: Contact details configured via environment (SECURITY_CONTACT_EMAIL) or open a private security advisory on GitHub.
- **PGP Key**: Available upon request.
- **Please Include**:
  - Detailed description of the vulnerability.
  - Proof-of-concept (PoC) script or curl commands.
  - Recommended fix or mitigation.
  - Expected impact on merchant funds or application integrity.

---

## 3. Responsible Disclosure SLA
- **Initial Acknowledgement**: Within 24 hours.
- **Triage & Severity Assessment**: Within 48 hours.
- **Patch Deployment**: Within 72 hours for critical vulnerabilities.
- **Public Disclosure**: Coordinated disclosure after patches are live across all networks.

---

## 4. Security Principles
1. **Zero Fund Custody**: Neither CryptoDao web servers nor the `PaymentRouter` smart contract ever hold user or merchant funds.
2. **Deterministic Settlement**: Smart contracts execute atomic token transfers from payer directly to merchant. Protocol fee is currently 0%. The contract owner can set a fee for future payments, capped in code at 1%.
3. **No Key Storage**: We never request, handle, store, or log private keys or seed phrases.
4. **Verifiable Deployments**: Smart contract source code is [verified on Snowtrace (Fuji testnet)](https://testnet.snowtrace.io/address/0xb94A922261bBa2e07648520bf56125a4102eaB95#code); reproducible compiler settings and constructor arguments are documented in `docs/VERIFY_ROUTER.md`.

---

## 5. Security Controls & Hardening Status
- **Error Monitoring**: PII scrubber implemented; error monitoring is NOT active yet (no Sentry.init).
- **Content Security Policy (CSP)**: Report-Only, includes 'unsafe-eval'/'unsafe-inline'; not yet enforcing.
- **Dependency Audit Status**: 25 total vulnerabilities (3 high in the prisma CLI chain, 22 moderate in the wallet stack). Running `npm audit fix --force` would downgrade prisma, so it was NOT run. The 3 high prisma CLI findings are verified not reachable at runtime in our code (`src/` imports only `@prisma/client`); the 22 moderate wallet findings are not verified.
