# Project Scope: Testnet-Only Demo (Avalanche Fuji)

> **Document Classification**: Strategic & Operational Scope  
> **Status**: Active (Applicable to all development and review phases)  
> **Target Audience**: Strategic Partners, Grant Reviewers, Protocol Integrators

---

## 1. Core Mandate

Raseed is scoped strictly as a **Testnet-Only Demo** deployed on the **Avalanche Fuji Testnet** (`chainId: 43113`). 

- **Purpose**: Facilitate technical evaluation, architecture walkthroughs, grant committee assessments, and institutional partnership conversations.
- **No Public Launch**: The application is **NOT** launched to the public consumer market.
- **No Mainnet Deployment**: There is **NO** mainnet deployment at this stage.

---

## 2. Network Policy: Fuji Only

1. **Active Environment**: All application workflows, smart contracts, backend verification logic, and reconciliation jobs execute solely against **Avalanche Fuji Testnet**.
2. **Mainnet Deployments Disabled**:
   - Deployment scripts targeting Avalanche C-Chain (`DeployMainnet.s.sol`) remain in the repository for architectural completeness, but are strictly guarded behind the `CONFIRM_MAINNET_DEPLOY=true` confirmation gate.
   - At runtime, the application configuration (`src/config/network.ts`) contains an automated security guard that refuses to execute against mainnet in production unless an explicit `ALLOW_MAINNET=true` environment override is supplied.
3. **Mainnet Gate**: No mainnet deployment shall occur until:
   - All criteria in [`docs/MAINNET_LAUNCH_CHECKLIST.md`](file:///Users/arpitbhardwaj/defi/docs/MAINNET_LAUNCH_CHECKLIST.md) are fully satisfied.
   - Formal third-party smart contract security reviews are completed.
   - Independent legal and regulatory opinions are formally issued.

---

## 3. Disclaimers & Terminology Rules

1. **Persistent Testnet Notice**:
   - Every primary interface (Landing Page, Public Pay Page, and Merchant Dashboard) must render an unmissable, always-visible notice:
     > **English**: "Testnet Demo — No Real Money"  
     > **Hindi**: "टेस्टनेट डेमो — कोई वास्तविक धन नहीं"
2. **Prohibited Terminology**:
   - Marketing, copy, documentation, or code comments must **NEVER** use misleading consumer financial claims or buzzwords:
     - ❌ `safe`
     - ❌ `audited`
     - ❌ `guaranteed`
     - ❌ `yield`
     - ❌ `APY`
     - ❌ `returns`
     - ❌ `investment`
3. **Legal Status**:
   - Legal documents (`/legal/terms`, `/legal/privacy`, `/legal/risks`) are designated as **"Demo Notice — Not Final Legal Terms"**.
   - They specify that software is provided strictly on an **"as-is"** basis, using testnet tokens without real funds, and does not provide financial or legal advice.

---

## 4. Partner & Grant Reviewer Audience

The platform presentation is targeted exclusively to institutional grant committees and technical partners:
- **Architectural Focus**: Demonstrates non-custodial merchant payment flows, deterministic invoice settlement, EIP-2612 permit authorization, idempotent server receipt verification, and automated reorg soft-invalidation.
- **No Consumer Funnels**: Zero consumer marketing slogans, promotional campaigns, or speculative sign-up inducements.

---

## 5. Access & Indexing (`DEMO_INVITE_MODE`)

- **Configuration**: An optional environment flag `DEMO_INVITE_MODE=true` (default: `false`).
- **Behavior**:
  - When enabled, dynamic robots configuration (`robots.txt`) disallows crawling across all paths.
  - Page metadata issues `noindex, nofollow, noarchive`.
  - Dynamic sitemap (`sitemap.xml`) yields an empty index.

> [!IMPORTANT]
> **DEMO_INVITE_MODE is strictly for search-engine indexing suppression (`noindex`, `nofollow`, empty `sitemap.xml`, and `robots.txt Disallow: /`). It is NOT an access control or authentication barrier.**

---

## 6. Security Hygiene Posture

All security standards developed during protocol hardening remain strictly enforced:
- **Zero Secrets**: No private keys or secrets logged, tracked, or committed.
- **Database Isolation**: Complete separation between production and test databases with ON DELETE RESTRICT foreign keys and PostgreSQL advisory locks.
- **Determinism**: 100% test pass rate maintained under sequential deterministic test runners.
