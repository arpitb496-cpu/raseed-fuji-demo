# Security Policy & Vulnerability Disclosure (SECURITY.md)

Raseed prioritizes the protection of self-custodial transactions. We welcome responsible security reports from researchers and the community.

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
1. **Zero Fund Custody**: Neither Raseed web servers nor the `PaymentRouter` smart contract ever hold user or merchant funds.
2. **Deterministic Settlement**: Smart contracts execute atomic token transfers from payer directly to merchant.
3. **No Key Storage**: We never request, handle, store, or log private keys or seed phrases.
4. **Verifiable Deployments**: Smart contract verification instructions are documented with reproducible compiler settings and constructor arguments (see `docs/VERIFY_ROUTER.md`).
