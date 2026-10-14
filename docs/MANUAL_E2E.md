# Manual End-to-End Testing Guide: Avalanche Fuji (Core Wallet)

This guide documents the complete end-to-end testing procedure on **Avalanche Fuji Testnet** using the **Core Wallet** (Avalanche native browser wallet).

---

## 1. Environment & Contract Information

* **Network**: Avalanche Fuji Testnet
* **Chain ID**: `43113`
* **RPC URL**: `https://api.avax-test.network/ext/bc/C/rpc`
* **Explorer**: `https://testnet.snowtrace.io`
* **Native Circle USDC (Fuji)**: `0x5425890298aed601595a70AB815c96711a31Bc65` (6 decimals)
* **Deployed PaymentRouter Contract**: `0xb94A922261bBa2e07648520bf56125a4102eaB95`

---

## 2. Prerequisites & Faucets

1. **Browser Wallet**: Install the [Core Wallet](https://core.app/) extension (or MetaMask / Rabby).
2. **Testnet AVAX for Gas**:
   - Request Fuji AVAX from the Avalanche testnet faucet: [https://core.app/tools/testnet-faucet/](https://core.app/tools/testnet-faucet/)
3. **Testnet USDC for Payments**:
   - Request Fuji USDC from the Circle Faucet: [https://faucet.circle.com/](https://faucet.circle.com/) (select *Avalanche Fuji* network).

---

## 3. Merchant Flow (Invoice Creation)

1. **Start the Development Server**:
   ```bash
   npm run dev
   ```
2. **Access Dashboard**:
   - Navigate to `http://localhost:3000/app`
   - Connect your merchant wallet using the Core Wallet connector.
   - Sign the SIWE (Sign-In with Ethereum) authentication prompt.
3. **Create an Invoice**:
   - Click **New Invoice** (`/app/invoices/new`).
   - Title: `Web3 Security Consultation`
   - Line Item: `1 Unit @ 1.00 USDC` (Total: `1.00 USDC` / 1,000,000 micro-units).
   - Set Due Date (e.g., 7 days from now).
   - Save invoice.
4. **Copy Public Payment Link**:
   - In the invoice detail page (`/app/invoices/[id]`), verify the generated unguessable public link:
     `http://localhost:3000/pay/raseed_<unguessableId>`

---

## 4. Payer Flow (Public Payment Page)

1. **Open Payment Link in Incognito Window / Separate Profile**:
   - Open `http://localhost:3000/pay/[publicId]`.
2. **Verify Security & Anti-Enumeration Invariants**:
   - Check that **NO client email** or internal database cuid IDs are shown.
   - Verify that merchant display name, line items, amount, remaining balance, and due date are correctly displayed.
   - Try navigating to `http://localhost:3000/pay/raseed_invalid_123` and verify the identical, generic 404 response.
3. **Connect Payer Wallet**:
   - Click **Connect Wallet** and select Core Wallet.
   - If connected to a network other than Avalanche Fuji, verify the UI displays a prompt to **Switch to Avalanche Fuji**.
4. **Inspect Balance & Approval**:
   - The UI checks native Fuji USDC balance.
   - Click **Pay 1.00 USDC**.
5. **Exact Allowance Approval**:
   - Core Wallet will prompt for ERC-20 approval.
   - **Crucial Invariant Check**: Verify the allowance spending cap requested is **EXACTLY 1.00 USDC** (1,000,000 micro-units), **NEVER** infinite (`type(uint256).max`).
   - Confirm the approval transaction in Core Wallet.
6. **Execute Payment Transaction**:
   - Core Wallet will prompt for the `PaymentRouter.pay(onchainInvoiceId, merchant, amount)` transaction.
   - Confirm the transaction.
7. **Client Verification & Confirmation**:
   - Once mined, the client automatically reports `{ publicId, txHash }` to `/api/pay/[publicId]/report`.
   - The confirmation card displays a green success seal and a link to the Snowtrace transaction:
     `https://testnet.snowtrace.io/tx/<txHash>`

---

## 5. Settlement & Merchant Receipt Verification

1. **Merchant Dashboard Verification**:
   - Return to the merchant window (`/app/invoices/[id]`).
   - Verify the invoice status has dynamically updated to **PAID** (green badge).
   - Verify the **Settlement History** table displays:
     - Confirmed timestamp
     - Payer address (`0x...`)
     - Settled amount (`+1.00 USDC`)
     - Snowtrace transaction link
2. **Download Bilingual Demo Receipt**:
   - Click the **Download Receipt** button.
   - Open the generated PDF:
     - Check that all merchant and payer fields are escaped.
     - Check bilingual headings: *PAYMENT RECEIPT (TESTNET) / भुगतान रसीद (टेस्टनेट)*.
     - Verify embedded Devanagari typography rendered via local bundled fonts.
     - Verify zero network requests were made during rendering.

---

## 6. Edge Cases Manual Verification

* **Partial Payment**: Create an invoice for `5.00 USDC`. Pay `2.00 USDC`. Verify status updates to **PARTIALLY_PAID** with remaining balance `3.00 USDC`. Settle the remaining `3.00 USDC` and verify status becomes **PAID**.
* **Dust Payment**: Call `PaymentRouter.pay` directly with 1 micro-USDC (`0.000001 USDC`). Verify payment event is recorded in the table with a *Dust (<0.01 USDC)* badge, but the invoice status remains **SENT** (not marked partially paid).
* **Payment to Cancelled Invoice**: Cancel a draft invoice, then send payment. Verify status remains **CANCELLED** and the merchant timeline displays the *On Cancelled Invoice* warning.
