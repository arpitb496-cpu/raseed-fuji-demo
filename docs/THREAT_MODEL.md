# Threat Model & Attack Surface Analysis (THREAT_MODEL.md)

## 1. Scope & Primary Assets
Raseed is a non-custodial stablecoin invoicing protocol on Avalanche C-Chain. The system handles:
1. **Payer Funds**: Native USDC held by payers in self-custody wallets.
2. **Merchant Receivables**: USDC directed to merchant payout addresses.
3. **Invoice Metadata**: Line items, amounts, merchant and optional client details.
4. **Merchant Identity & Sessions**: SIWE session authentication cookies.

---

## 2. Threat Actors
- **External Attacker**: Malicious web actors trying to forge payments, steal funds via fake UI links, or execute XSS/CSRF.
- **Malicious Payer**: Tries to pay less than invoice value, pay with counterfeit tokens, double-spend, or claim an invoice was paid when it was not.
- **Malicious Merchant**: Tries to tamper with invoice terms post-payment, or access other merchants' billing data (IDOR).
- **Compromised Infrastructure**: Untrusted RPC node, database leak, or compromised third-party script.

---

## 3. Attack Vectors & Mitigations

### 3.1. Front-End Tampering & Rogue Payment Address
* **Threat**: Attacker tampers with the client-side bundle or intercepts client request to replace the merchant's payout wallet address with an attacker's address.
* **Mitigation**:
  - The pay page displays the full merchant address and links directly to Snowtrace.
  - Server-side payment verification strictly validates that the on-chain `Paid` event recipient matches the database record's `merchant.walletAddress`.
  - Content Security Policy (CSP) blocks unauthorized inline scripts and external origins.
  - Payer wallet confirmation dialog prompts user with exact recipient and amount.

### 3.2. Fake Payment / Forged Transaction Hash
* **Threat**: Malicious payer calls `/api/invoices/[id]/verify` with a random transaction hash, an unrelated USDC transfer hash, or a reverted transaction.
* **Mitigation**:
  - The verification API **never** trusts the frontend receipt payload.
  - Verification fetches the full transaction receipt from Avalanche C-Chain RPC via `viem`.
  - Asserts `receipt.status === 'success'`.
  - Asserts `receipt.to === PaymentRouter.address`.
  - Asserts `receipt.logs` contains the `Paid` event emitted by the verified contract.
  - Decodes event arguments and strictly matches:
    - `invoiceId == onchainInvoiceId`
    - `merchant == invoice.merchant.walletAddress`
    - `amount >= invoice.amountUsdc`
  - Rejects if any condition is not met.

### 3.3. Replay, Denial-of-Service & Invoice Griefing Attacks
* **Threat 1 (Invoice Griefing / Denial-of-Service via Micro-Payment)**:
  - *Vector*: Because merchant payout addresses are public on invoice payment links, if a smart contract enforces on-chain double-pay protection (even scoped by merchant), an attacker could front-run or spam `pay(invoiceId, victimMerchant, 1)` with 1 micro-USDC ($0.000001). Under an on-chain single-payment model, this would permanently revert the invoice with `InvoiceAlreadyPaid`, locking the payer out from ever settling their bill.
  - *Mitigation*: The `PaymentRouter` smart contract keeps **zero per-invoice settlement state**. `isPaid` mappings and `InvoiceAlreadyPaid` checks are removed entirely. All calls with valid parameters transfer funds and emit `Paid(invoiceId, payer, merchant, amount, fee)`.
  - *Off-Chain Settlement Engine (Phase 5)*:
    1. Server tracks cumulative payments by summing canonical `Paid` events matching `(merchant, onchainInvoiceId)` on the verified router address.
    2. An invoice transitions to **`PAID`** only when `sum(Paid.amount) >= invoice.amountUsdc` across `N` block confirmations.
    3. An attacker paying 1 micro-USDC only credits 1 unit to the merchant's balance; because `1 < invoice.amountUsdc`, the real payer can still pay the remaining amount and complete settlement.
    4. Payments under the required balance mark the invoice **`PARTIALLY_PAID`**.
    5. Overpayments or unexpected payments on expired/cancelled invoices are recorded in audit logs and flagged prominently on the merchant dashboard (never silently ignored).
    6. Sub-cent dust spams (`< 0.01 USDC`) do not trigger status churn.
* **Threat 2 (Off-Chain Verification Replay)**:
  - *Vector*: Attacker submits a valid previous transaction hash from an unrelated invoice to mark another invoice as paid.
  - *Mitigation*: Server-side verification enforces unique transaction hash linkage (`PaymentEvent.txHash`). Each event log is decoded and validated against the specific target `(merchant, onchainInvoiceId)`.

### 3.4. Phishing Clone of Pay Pages
* **Threat**: Attacker creates a replica of `raseed.fi/pay/[id]` on a typosquat domain with an attacker contract.
* **Mitigation**:
  - Clear domain branding and warnings displayed on all pay links.
  - Pay page prominently displays the verified Avalanche chain ID (43113/43114) and verified `PaymentRouter` address.
  - Clear UI guidance recommending payers check contract address in MetaMask/Core before signing.

### 3.5. Blockchain Reorgs
* **Threat**: Payer pays an invoice on a shallow fork; server marks invoice as PAID, but the transaction is reorganized out of the canonical chain.
* **Mitigation**:
  - Avalanche consensus has sub-second finality with near-zero reorg probability.
  - Payment verification checks the latest canonical block state and requires confirmation confirmations before final settlement.
  - Background reconciliation job verifies event persistence.

### 3.6. Malicious Token Injection, Fee-On-Transfer & Circle Blacklists
* **Threat 1 (Malicious / Fee-On-Transfer Token Injection)**:
  - *Vector*: Attacker triggers payments using a fee-on-transfer token, reentrancy token, or counterfeit USDC.
  - *Mitigation*: `PaymentRouter` immutably pins the official Circle `USDC` token address at construction (`0x5425890298aed601595a70AB815c96711a31Bc65` on Fuji, `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` on Avalanche Mainnet). Non-standard tokens cannot be routed through production contracts. SafeERC20 is used for all operations, and the router retains strictly zero balances.
* **Threat 2 (Circle USDC Compliance Blacklisting)**:
  - *Vector*: A merchant's wallet address has been blacklisted on-chain by Circle's regulatory compliance module (`Blacklistable`).
  - *Mitigation*: Any attempt to pay a blacklisted merchant will cause Circle's USDC contract to revert on `transferFrom`. The router will fail cleanly, funds will not leave the payer's wallet, and the UI will alert the payer that the destination merchant address cannot receive USDC.

### 3.7. Authorization Bypass & IDOR
* **Threat**: Merchant A manipulates invoice IDs in API calls to read, update, or cancel Merchant B's invoices.
* **Mitigation**:
  - All `/api/app/*` routes require active SIWE session.
  - Database queries include `WHERE id = :invoiceId AND merchantId = :sessionMerchantId`.
  - Attempting to access another merchant's invoice returns 403 Forbidden.
  - Extensive Vitest tests verify IDOR denial.

### 3.8. Database Exposure & PII Leakage
* **Threat**: Database snapshot is leaked.
* **Mitigation**:
  - Zero passwords, zero private keys, and zero seed phrases are stored.
  - Optional client PII: client name and email are optional.
  - Public IDs are high-entropy CUIDs/NanoIDs preventing invoice enumeration.
  - Rate limiting on public `/pay/[publicId]` endpoints prevents brute-force enumeration.

### 3.9. Denial of Service (DoS) & Brute Force
* **Threat**: Attacker spams invoice creation, SIWE nonce generation, or PDF generation endpoints to exhaust server resources.
* **Mitigation**:
  - Rate limiting enforced on all sensitive routes (SIWE auth, invoice creation, PDF generation).
  - Upstash Redis rate limiting with local sliding-window fallback in development.
  - Strict payload validation with Zod (restricting string sizes and item limits).
