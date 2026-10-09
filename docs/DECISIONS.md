# Architecture & Product Decisions (DECISIONS.md)

This document records the architectural, technical, product, and security decisions for **Raseed Protocol**.

---

## 1. Product Name & Branding
* **Decision**: The project name is configured as **Raseed** (रसीद), the widely recognized Hindustani term for receipt/invoice, reflecting an India-first cross-border payment experience.
* **Modularity**: Brand identity is isolated in `src/config/branding.ts` (App Name, Tagline, Logo, Symbol, Support Links). Changing the product name in this single file propagates across UI, legal copy, and meta tags.
* **Alternatives Evaluated**:
  * *Challan* (often carries punitive connotations in India).
  * *Settlo* (generic global fintech vibe, lacks cultural resonance).
  * *Bahi* (traditional ledger term, but less intuitive for international clients).

---

## 2. Blockchain & Token Configuration
* **Default Network**: Avalanche Fuji Testnet (`chainId: 43113`).
* **Production Network**: Avalanche C-Chain Mainnet (`chainId: 43114`), gated strictly by `NEXT_PUBLIC_NETWORK=mainnet`.
* **USDC Addresses** (Verified from Circle's Official Documentation):
  * **Mainnet (43114)**: `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` (Native USDC issued by Circle).
  * **Fuji Testnet (43113)**: `0x5425890298aed601595a70AB815c96711a31Bc65` (Native USDC Testnet faucet token).
  * **Decimals**: Pinned to 6 decimals, with an on-chain sanity check assertion at runtime.
* **Token Scope**: v1 exclusively supports native USDC. Bridged tokens (e.g. USDC.e) and rebasing/fee-on-transfer tokens are rejected to prevent accounting anomalies and reentrancy exploits.

---

## 3. Smart Contract Design (PaymentRouter)
* **Zero Custody Invariant**: The contract holds **zero token balance** before, during, and after any transaction. Tokens are transferred atomically from `msg.sender` to the merchant wallet (and optional treasury).
* **Stateless Settlement & Permanent Anti-Griefing**: The smart contract keeps **zero per-invoice settlement state**. `isPaid` mappings and `InvoiceAlreadyPaid` errors are completely omitted from the contract bytecode.
  - *Griefing Root Cause*: Because the contract cannot know the off-chain invoice price, any on-chain single-payment restriction allowed an attacker to call `pay(victimInvoiceId, victimMerchant, 1)` with 1 micro-USDC and permanently brick the payer's ability to settle the legitimate invoice.
  - *Stateless Model*: The router validates inputs, executes transfers via SafeERC20, and emits `Paid(invoiceId, payer, merchant, amount, fee)`. Multiple payments to the same invoice (partial payments, top-ups, separate installments) succeed unhindered on-chain. All settlement and accounting logic is securely performed **off-chain** by observing verified canonical logs.
* **Fee-on-Transfer & Circle Token Dynamics**:
  - The router constructor immutably pins the official Circle USDC token contract address. Arbitrary tokens cannot be routed through production contracts.
  - *Circle USDC Blacklist Note*: Native Circle USDC has a built-in blacklisting mechanism (`Blacklistable`). If a merchant address is blacklisted by Circle compliance, `SafeERC20.safeTransferFrom` will revert on-chain, preventing transfers. The UI explicitly alerts merchants if an address appears blacklisted.
* **Fee Structure**:
  * Default `feeBps = 0`.
  * Hard-capped in contract bytecode at `100` basis points (1.00%).
  * Fee management restricted to contract owner via OpenZeppelin's `Ownable2Step`.
  * Owner cannot pause payments or trap funds because the contract holds no balances.
* **Exact Approval Policy**: Frontend prompts only exact-token approval (`approve(router, amount)`), never infinite allowance (`type(uint256).max`), minimizing payer risk exposure.
* **Permit (EIP-2612)**: Supported conditionally via `payWithPermit` if token supports EIP-2612 signatures; standard approval + payment flow is maintained as primary fallback.

---

## 4. Payment Verification Strategy & Off-Chain Settlement Engine (Phase 5 Spec)
* **Zero Client Trust**: The frontend UI is never trusted to mark an invoice as paid.
* **Cumulative Event Summation**:
  - The server queries verified canonical `Paid` event logs on Avalanche C-Chain for `(merchantAddress, onchainInvoiceId)` emitted by the configured `PaymentRouter`.
  - The server sums all verified amounts: `cumulativePaid = sum(event.amount)`.
* **State Transition Rules**:
  - **`PAID`**: Triggered when `cumulativePaid >= invoice.amountUsdc` after `N` block confirmations (sub-second finality on Avalanche).
  - **`PARTIALLY_PAID`**: If `0 < cumulativePaid < invoice.amountUsdc`, invoice moves to `PARTIALLY_PAID`. The payer UI displays remaining balance due (`invoice.amountUsdc - cumulativePaid`).
  - **Overpayments & Unexpected Payments**: If `cumulativePaid > invoice.amountUsdc` or if unexpected payments arrive for cancelled/expired invoices, the payment is recorded in `PaymentEvent` audit logs and flagged prominently on the merchant dashboard (never silently ignored or discarded).
  - **Dust Threshold Protection**: Micro-dust transactions below a configurable threshold (e.g. `< 0.01 USDC` / `10_000` micro-units) do not trigger invoice status changes to prevent notification spam.
* **Background Reconciliation**: A scheduled cron endpoint (`/api/cron/reconcile`) queries the `PaymentRouter` event logs for recent blocks and reconciles any invoices whose payment confirmation was dropped by client connectivity issues.

---

## 5. Merchant Authentication & Authorization
* **Sign-In with Ethereum (SIWE)**:
  - Cryptographic wallet authentication using EIP-4361.
  - Server issues a single-use cryptographically random nonce stored in an httpOnly session.
  - Verification validates domain, nonce, timestamp expiry, and chainId.
  - Zero passwords, zero private keys, and zero seed phrases stored anywhere on servers.
* **Session Management**: Iron-session or JWT in an encrypted `httpOnly`, `Secure`, `SameSite=Lax` cookie.
* **Strict Authorization**: Every merchant endpoint validates `session.address === invoice.merchant.walletAddress`. Direct Object Reference (IDOR) attempts return 403 Forbidden.

---

## 6. Data Model & Privacy
* **Numeric Accuracy**: All financial amounts are stored as integer micro-USDC (6 decimals: 1 USDC = 1,000,000 units), completely avoiding floating-point rounding issues.
* **Public Identifiers**: Invoices have a public unguessable NanoID/CUID2 (`publicId`, 24+ alphanumeric characters). Guessing or enumerating invoices is mathematically infeasible.
* **PII Minimization**: Client name and client email are purely optional fields.
* **Merchant Privacy Rights**: Built-in "Delete My Account & Data" action, and "Export All Invoices (CSV)" action.
* **Display Currency**: Approximate INR and USD reference rates fetched periodically, clearly labeled as indicative with timestamp disclaimer.

---

## 7. Internationalization (i18n)
* **Supported Languages**: English (`en`) and Hindi (`hi`).
* **Implementation**: Structured JSON dictionaries (`src/locales/en.json`, `src/locales/hi.json`) covering 100% of UI strings, validation errors, and legal disclaimers.
* **Accessibility**: Dynamically updates `<html lang="en">` or `<html lang="hi">` and respects font stack (Inter + Noto Sans Devanagari).
