# Architecture & Product Decisions (DECISIONS.md)

This document records the architectural, technical, product, and security decisions for **CryptoDao**.

---

## 1. Product Name & Branding
* **Decision**: The project name is configured as **CryptoDao** (display branding). CryptoDao is a project name. It is not a DAO and has no token or on-chain governance.
* **Modularity**: Brand identity is isolated in `src/config/branding.ts` (App Name, Tagline, Logo, Symbol, Support Links). Changing the product name in this single file propagates across UI, legal copy, and meta tags.
* **Alternatives Evaluated**:
  * *Challan* (often carries punitive connotations in India).
  * *Settlo* (generic global fintech vibe, lacks cultural resonance).
  * *Bahi* (traditional ledger term, but less intuitive for international clients).

---

## 2. Blockchain & Token Configuration
* **Default Network**: Avalanche Fuji Testnet (`chainId: 43113`).
* **Production Network**: Avalanche C-Chain Mainnet (`chainId: 43114`), gated strictly by `NEXT_PUBLIC_NETWORK=mainnet`.
* **USDC Addresses** (Checked against Circle's published documentation; re-check before any mainnet use):
  * **Mainnet (43114)**: `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` (Native USDC issued by Circle).
  * **Fuji Testnet (43113)**: `0x5425890298aed601595a70AB815c96711a31Bc65` (Native USDC Testnet faucet token).
  * **Decimals**: Pinned to 6 decimals, with an on-chain sanity check assertion at runtime.
* **Token Scope**: v1 exclusively supports native USDC. Bridged tokens (e.g. USDC.e) and rebasing/fee-on-transfer tokens are rejected to prevent accounting anomalies and reentrancy exploits.

---

## 3. Smart Contract Design (PaymentRouter)
* **Zero Custody Invariant**: The contract holds **zero token balance** before, during, and after any transaction. Tokens are transferred atomically from `msg.sender` to the merchant wallet (and optional treasury).
* **Zero Per-Invoice Settlement State & Permanent Anti-Griefing**: The smart contract keeps **zero per-invoice settlement state**. `isPaid` mappings and `InvoiceAlreadyPaid` errors are completely omitted from the contract bytecode. The contract never holds funds: it transfers tokens atomically from payer to merchant and keeps no token balance.
  - *Griefing Root Cause*: Because the contract cannot know the off-chain invoice price, any on-chain single-payment restriction allowed an attacker to call `pay(victimInvoiceId, victimMerchant, 1)` with 1 micro-USDC and permanently brick the payer's ability to settle the legitimate invoice.
  - *Off-Chain Settlement Model*: The router validates inputs, executes transfers via SafeERC20, and emits `Paid(invoiceId, payer, merchant, amount, fee)`. Multiple payments to the same invoice (partial payments, top-ups, separate installments) succeed unhindered on-chain. All settlement and accounting logic is securely performed **off-chain** by observing confirmed canonical logs.
* **Fee-on-Transfer & Circle Token Dynamics**:
  - The router constructor immutably pins the canonical Circle USDC token contract address. Arbitrary tokens cannot be routed through production contracts.
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
  - The server queries confirmed canonical `Paid` event logs on Avalanche C-Chain for `(merchantAddress, onchainInvoiceId)` emitted by the configured `PaymentRouter`.
  - The server sums all confirmed amounts: `cumulativePaid = sum(event.amount)`.
* **State Transition Rules**:
  - **`PAID`**: Triggered when `cumulativePaid >= invoice.amountUsdc` after `N` block confirmations (sub-second finality on Avalanche).
  - **`PARTIALLY_PAID`**: If `0 < cumulativePaid < invoice.amountUsdc`, invoice moves to `PARTIALLY_PAID`. The payer UI displays remaining balance due (`invoice.amountUsdc - cumulativePaid`).
  - **Overpayments & Unexpected Payments**: If `cumulativePaid > invoice.amountUsdc` or if unexpected payments arrive for cancelled/expired invoices, the payment is recorded in `PaymentEvent` audit logs and flagged prominently on the merchant dashboard (never silently ignored or discarded).
  - **Dust Threshold Protection**: Micro-dust transactions below a threshold (`< 0.01 USDC` / `10_000` micro-units) do not trigger invoice status changes on their own to prevent griefing/notification spam.

### 4.1 Dust Payment Accounting (< 0.01 USDC / 10,000 micro-USDC)
* **Storage & Ledger**: Every confirmed payment event—regardless of size—is stored in `PaymentEvent` and contributes to the cumulative received total (`invoice.paidAmountUsdc`).
* **Status Invariance**: Dust payments alone NEVER change invoice status. An invoice in `SENT` status receiving only dust remains in `SENT` status (never `PARTIALLY_PAID`).
* **Transition Criteria**: The invoice transitions to `PARTIALLY_PAID` only when at least one non-dust payment (`>= 0.01 USDC` / `10,000` micro-units) is confirmed. It transitions to `PAID` when cumulative valid payments reach or exceed `invoice.amountUsdc`.
* **Merchant UI & Audit**: Dust events are visibly flagged with a "Dust" badge in the invoice payments timeline and recorded in `AuditLog`.
### 4.2 Draft Invoice Payments and GET /api/pay/[publicId] Behavior (Phase 5.7 Spec)
* **Public Pay API Exposure (`GET /api/pay/[publicId]`)**:
  - Exposes sanitized public invoice fields: `title`, `amountUsdc`, `dueDate`, `merchant` details, and `status: "DRAFT"`.
  - Strictly omits internal database IDs, clientEmail, and PII.
  - Pay client UI (`PayInvoiceClient.tsx`) observes `status === "DRAFT"` and disables payment actions, displaying an informational message to the payer that the invoice has not yet been formally issued by the merchant.
* **On-Chain Settlement for Draft Invoices**:
  - If on-chain funds arrive for a DRAFT invoice (e.g. payer executes `PaymentRouter.pay` directly with the `onchainInvoiceId`), the settlement engine recognizes that actual USDC was transferred peer-to-peer to the merchant's wallet.
  - Recording it is correct and mandatory: the settlement engine advances the invoice status to `PAID` (or `PARTIALLY_PAID`).
  - To alert the merchant of this anomaly, the settlement engine logs an audit action `PAYMENT_ON_DRAFT_INVOICE`, and the merchant invoice payments table visibly flags the payment with an **"On Draft / ड्राफ्ट पर भुगतान"** badge.

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
* **Numeric Accuracy**: All financial amounts are stored as integer micro-USDC (6 decimals: 1 USDC = 1,000,000 units, `BigInt` in schema/DB), completely avoiding floating-point rounding issues.
* **Public Identifiers**: Invoices have a public unguessable identifier (`publicId`, 24+ base64url characters with 18 bytes of entropy). Guessing or enumerating invoices is mathematically infeasible.
* **PII Minimization**: Client name and client email are purely optional fields.
* **Merchant Privacy Rights & "Delete My Data" Specification**:
  - **Zero Financial History**: If a merchant has only unpaid drafts or zero payment records, a hard delete cascades and removes the merchant and invoices.
  - **Merchants with PAID / PARTIALLY_PAID Invoices**: When a merchant with paid invoices or confirmed `PaymentEvent` rows exercises their right to be forgotten:
    1. **Personal Identity Anonymized**: `displayName` is replaced with `"Anonymized Merchant"`, `businessName` and `country` are set to `null`.
    2. **Counterparty PII Anonymized**: On all associated invoices, `clientName` is replaced with `"Anonymized Client"`, `clientEmail` and `notes` are set to `null`.
    3. **Draft Cleanup**: Unpaid draft or cancelled invoices with zero payments are deleted.
    4. **Financial Ledger Preservation**: Immutable on-chain settlement records (`PaymentEvent`), transaction hashes, chain IDs, block numbers, micro-USDC amounts, and invoice amounts are strictly retained to satisfy statutory accounting, tax, anti-fraud, and payer proof-of-payment requirements.
* **Display Currency**: Approximate INR and USD reference rates fetched periodically, clearly labeled as indicative with timestamp disclaimer.

---

## 7. Wallet Connectors & Security Policy
* **Explicit Connector Governance**: Wagmi / RainbowKit configuration strictly specifies supported Avalanche wallets: Core, MetaMask, Rabby, Injected, and WalletConnect.
* **No Coinbase / Base Wallet Connectors**: Coinbase and Base wallet connectors are explicitly excluded from the application connector list to ensure clean, deterministic Avalanche C-Chain settlement without non-Avalanche SDK interference.
* **Submodule & Vendoring Proof**: Core dependencies such as `contracts/lib/openzeppelin-contracts` are tracked directly in git with 544 files vendored to ensure repeatable fresh-clone builds (`forge build && forge test`).

---

## 8. Internationalization (i18n)
* **Supported Languages**: English (`en`) and Hindi (`hi`).
* **Implementation**: Structured JSON dictionaries (`src/locales/en.json`, `src/locales/hi.json`) covering 100% of UI strings, validation errors, and legal disclaimers.
* **PDF Rendering**: Server-side PDF generation utilizes Chromium rendering engine with Noto Sans Devanagari to provide 100% native HarfBuzz OpenType complex text shaping for Hindi conjuncts (e.g. "श्रीमान", "क्षत्रिय", "द्वारा भुगतान").
* **Accessibility**: Dynamically updates `<html lang="en">` or `<html lang="hi">` and respects font stack (Inter + Noto Sans Devanagari).
