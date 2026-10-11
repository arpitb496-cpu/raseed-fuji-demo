# Snowtrace / Routescan Contract Verification Plan (VERIFY_ROUTER.md)

This document provides the exact, non-broadcast command and configuration parameters required to verify the deployed `PaymentRouter` contract on Avalanche Fuji Testnet.

> **CRITICAL POLICY NOTICE**:
> 1. **Do NOT run anything that needs a private key**. Contract verification requires **zero private keys**, zero accounts, and zero gas. It is a purely public metadata and bytecode submission.
> 2. **Current Verification Status**: Router `0xb94A922261bBa2e07648520bf56125a4102eaB95` currently displays only bytecode on Snowtrace. Until verification is manually run and confirmed, **no UI or documentation in this repository may claim "verified on Snowtrace"**.

---

## 1. Official Verification API & Documentation Citation

Following the official transition of Avalanche C-Chain / Fuji block explorer infrastructure from legacy Etherscan to **Routescan**:
* **Official Routescan Documentation**: [https://docs.routescan.io/](https://docs.routescan.io/)
* **Official Routescan API Endpoint Reference**: [https://api.routescan.io/](https://api.routescan.io/)
* **Fuji Testnet (Chain ID 43113) Verifier URL**:
  `https://api.routescan.io/v2/network/testnet/evm/43113/etherscan`
* **API Key**: Routescan supports `"verifyContract"` as an open placeholder API key for testnet verification (or your personal key from the Routescan portal if rate-limited).

---

## 2. Deployed Contract Parameters (Extracted from Repository & On-Chain Tx)

All values below have been validated against `contracts/foundry.toml`, `contracts/script/DeployFuji.s.sol`, and on-chain deployment transaction `0x7267ee88fff671f7ca6d78d83a134e5c9bc9b34d1d1147ea0c333919a75deaec` (Block 59271254):

| Parameter | Value | Source |
|---|---|---|
| **Contract Address** | `0xb94A922261bBa2e07648520bf56125a4102eaB95` | `contracts/deployments.json` |
| **Contract Name** | `src/PaymentRouter.sol:PaymentRouter` | Repo source tree |
| **Network / Chain ID** | `43113` (Avalanche Fuji Testnet) | `contracts/deployments.json` |
| **Compiler Version** | `0.8.24` (`v0.8.24+commit.e11b9ed9`) | `contracts/foundry.toml: solc_version = "0.8.24"` |
| **Optimization** | Enabled (`true`) | `contracts/foundry.toml: optimizer = true` |
| **Optimization Runs** | `200` | `contracts/foundry.toml: optimizer_runs = 200` |
| **Via IR** | `false` | `contracts/foundry.toml: via_ir = false` |
| **EVM Version** | `paris` (default for solc 0.8.24 / Foundry) | Foundry default |
| **Deployment Tx Hash** | `0x7267ee88fff671f7ca6d78d83a134e5c9bc9b34d1d1147ea0c333919a75deaec` | Avalanche Fuji C-Chain block 59271254 |

### Constructor Arguments

The `PaymentRouter` constructor signature is:
```solidity
constructor(address _usdc, address _initialTreasury, address _initialOwner)
```

Values extracted directly from the deployment transaction input data:
1. `_usdc`: `0x5425890298aed601595a70AB815c96711a31Bc65` (Native Circle USDC on Avalanche Fuji)
2. `_initialTreasury`: `0x920b3e4Eb589761434ca7673CE56Eb37eA5a81ca`
3. `_initialOwner`: `0x920b3e4Eb589761434ca7673CE56Eb37eA5a81ca`

**Pre-encoded ABI Hex Representation** (without `0x` prefix):
```
0000000000000000000000005425890298aed601595a70ab815c96711a31bc65000000000000000000000000920b3e4eb589761434ca7673ce56eb37ea5a81ca000000000000000000000000920b3e4eb589761434ca7673ce56eb37ea5a81ca
```

---

## 3. Exact Verification Commands

Run these commands from the `contracts/` directory.

### Option A: Standard Forge Verification (Automated via Routescan API)

```bash
cd contracts

forge verify-contract \
  0xb94A922261bBa2e07648520bf56125a4102eaB95 \
  src/PaymentRouter.sol:PaymentRouter \
  --chain-id 43113 \
  --compiler-version 0.8.24 \
  --num-of-optimizations 200 \
  --constructor-args 0000000000000000000000005425890298aed601595a70ab815c96711a31bc65000000000000000000000000920b3e4eb589761434ca7673ce56eb37ea5a81ca000000000000000000000000920b3e4eb589761434ca7673ce56eb37ea5a81ca \
  --verifier-url "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan" \
  --etherscan-api-key "verifyContract" \
  --watch
```

### Option B: Verification using Dynamic `cast abi-encode`

```bash
cd contracts

forge verify-contract \
  0xb94A922261bBa2e07648520bf56125a4102eaB95 \
  src/PaymentRouter.sol:PaymentRouter \
  --chain-id 43113 \
  --compiler-version 0.8.24 \
  --num-of-optimizations 200 \
  --constructor-args $(cast abi-encode "constructor(address,address,address)" 0x5425890298aed601595a70AB815c96711a31Bc65 0x920b3e4Eb589761434ca7673CE56Eb37eA5a81ca 0x920b3e4Eb589761434ca7673CE56Eb37eA5a81ca) \
  --verifier-url "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan" \
  --etherscan-api-key "verifyContract" \
  --watch
```

---

## 4. Manual Fallback via Web Portal (If CLI API Times Out)

If the Routescan API endpoint rejects the automated multipart payload, verify manually using flattened code:

1. **Flatten the contract**:
   ```bash
   cd contracts
   forge flatten src/PaymentRouter.sol --output FlattenedPaymentRouter.sol
   ```
2. **Navigate to the Snowtrace / Routescan Contract Tab**:
   [https://testnet.snowtrace.io/address/0xb94A922261bBa2e07648520bf56125a4102eaB95#code](https://testnet.snowtrace.io/address/0xb94A922261bBa2e07648520bf56125a4102eaB95#code)
3. Click **"Verify and Publish"**.
4. Configure:
   * **Compiler Type**: Solidity (Single file)
   * **Compiler Version**: `v0.8.24+commit.e11b9ed9`
   * **Open Source License Type**: MIT License (3)
   * **Optimization**: Yes, 200 runs
   * **Constructor Arguments ABI-encoded**:
     `0000000000000000000000005425890298aed601595a70ab815c96711a31bc65000000000000000000000000920b3e4eb589761434ca7673ce56eb37ea5a81ca000000000000000000000000920b3e4eb589761434ca7673ce56eb37ea5a81ca`
5. Paste the contents of `FlattenedPaymentRouter.sol` and submit.
