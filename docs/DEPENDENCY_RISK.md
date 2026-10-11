# Dependency Risk Assessment & Contracts Hygiene (DEPENDENCY_RISK.md)

This document tracks vulnerability triage across all 25 findings identified via `npm audit --omit=dev`, bundler alias proofs, and smart contract dependency hygiene.

---

## 1. Full Audit Triage Table (`npm audit --omit=dev`: 25 Findings)

**Triage Status**: 25 findings triaged, none fixed, accepted risk with an upgrade plan.

| # | Package | Severity | Dependency Path | Stage | Target | Reachable by Our Code | Fix Path / Mitigation |
|---|---|---|---|---|---|---|---|
| 1 | `deepmerge-ts` | High | `prisma` → `@prisma/config` → `deepmerge-ts` | Build/CLI | Server (CLI) | **No** (build/CLI only) | Used strictly by Prisma CLI for merging config schemas. Not in runtime app bundle. Accepted risk. |
| 2 | `@prisma/config` | High | `prisma` → `@prisma/config` | Build/CLI | Server (CLI) | **No** (build/CLI only) | Prisma CLI configuration parser. Not imported in runtime code. Accepted risk. |
| 3 | `prisma` | High | Direct dev/build CLI (`prisma`) | Build/CLI | Server (CLI) | **No** (build/CLI only) | Database migration & generation CLI. Runtime uses `@prisma/client` binaries. Accepted risk. |
| 4 | `decode-uri-component` | Moderate | `@rainbow-me/rainbowkit` → `wagmi` → `@wagmi/connectors` → `@walletconnect/ethereum-provider` → `query-string` → `decode-uri-component` | Runtime | Client | package used; vulnerable path not shown reachable | Used internally by WalletConnect for URI pairing decode. Input is constrained by WalletConnect client modal. |
| 5 | `query-string` | Moderate | `...` → `@walletconnect/utils` → `query-string` | Runtime | Client | package used; vulnerable path not shown reachable | Transitive parser within WalletConnect. Resolved in upstream WalletConnect updates. |
| 6 | `@walletconnect/utils` | Moderate | `...` → `@walletconnect/utils` | Runtime | Client | package used; vulnerable path not shown reachable | WalletConnect internal utility methods. |
| 7 | `@walletconnect/core` | Moderate | `...` → `@walletconnect/core` | Runtime | Client | package used; vulnerable path not shown reachable | Core protocol transport for WalletConnect. |
| 8 | `@walletconnect/sign-client` | Moderate | `...` → `@walletconnect/sign-client` | Runtime | Client | package used; vulnerable path not shown reachable | Signing protocol client for WalletConnect v2. |
| 9 | `@walletconnect/universal-provider` | Moderate | `...` → `@walletconnect/universal-provider` | Runtime | Client | package used; vulnerable path not shown reachable | Provider abstraction for multi-chain WalletConnect. |
| 10 | `@walletconnect/ethereum-provider` | Moderate | `...` → `@wagmi/connectors` → `@walletconnect/ethereum-provider` | Runtime | Client | package used; vulnerable path not shown reachable | Ethereum JSON-RPC provider wrapper. |
| 11 | `uuid` | Moderate | `@rainbow-me/rainbowkit` → `wagmi` → `@wagmi/connectors` → `@metamask/sdk` → `uuid` | Runtime | Client | package used; vulnerable path not shown reachable | Missing buffer bounds check in uuid v3/v5/v6. Our application never passes custom buffers to MetaMask internal uuid functions. |
| 12 | `@metamask/utils` | Moderate | `...` → `@metamask/sdk` → `@metamask/utils` | Runtime | Client | package used; vulnerable path not shown reachable | MetaMask SDK utility library. |
| 13 | `@metamask/sdk-communication-layer` | Moderate | `...` → `@metamask/sdk` → `@metamask/sdk-communication-layer` | Runtime | Client | package used; vulnerable path not shown reachable | Internal communication channel between browser extension and page provider. |
| 14 | `@metamask/rpc-errors` | Moderate | `...` → `@metamask/sdk` → `@metamask/rpc-errors` | Runtime | Client | package used; vulnerable path not shown reachable | Standard EIP-1193 RPC error objects. |
| 15 | `@metamask/sdk` | Moderate | `...` → `@wagmi/connectors` → `@metamask/sdk` | Runtime | Client | package used; vulnerable path not shown reachable | MetaMask official SDK. Upstream bump in `@wagmi/connectors` will resolve. |
| 16 | `@gemini-wallet/core` | Moderate | `...` → `@wagmi/connectors` → `@gemini-wallet/core` | Runtime | Client | package used; vulnerable path not shown reachable | Connector packaged inside `@wagmi/connectors`; connector not registered in `Web3Provider` active connector list. |
| 17 | `@reown/appkit` | Moderate | `...` → `@walletconnect/universal-provider` → `@reown/appkit` | Runtime | Client | package used; vulnerable path not shown reachable | Modal controller UI bundle inside WalletConnect. |
| 18 | `@reown/appkit-controllers` | Moderate | `...` → `@reown/appkit` → `@reown/appkit-controllers` | Runtime | Client | package used; vulnerable path not shown reachable | State controller internals for Reown AppKit. |
| 19 | `@reown/appkit-pay` | Moderate | `...` → `@reown/appkit` → `@reown/appkit-pay` | Runtime | Client | package used; vulnerable path not shown reachable | Payment on-ramp extension bundled inside Reown; not invoked or enabled by our application. |
| 20 | `@reown/appkit-scaffold-ui` | Moderate | `...` → `@reown/appkit` → `@reown/appkit-scaffold-ui` | Runtime | Client | package used; vulnerable path not shown reachable | Web component UI scaffolding for wallet connect modal. |
| 21 | `@reown/appkit-ui` | Moderate | `...` → `@reown/appkit` → `@reown/appkit-ui` | Runtime | Client | package used; vulnerable path not shown reachable | Web component styles and templates for wallet connect modal. |
| 22 | `@reown/appkit-utils` | Moderate | `...` → `@reown/appkit` → `@reown/appkit-utils` | Runtime | Client | package used; vulnerable path not shown reachable | String and formatting utilities for Reown modal. |
| 23 | `@wagmi/connectors` | Moderate | `@rainbow-me/rainbowkit` → `wagmi` → `@wagmi/connectors` | Runtime | Client | package used; vulnerable path not shown reachable | Standard EVM connector collection. Exposes standard wallet connections. |
| 24 | `wagmi` | Moderate | `@rainbow-me/rainbowkit` → `wagmi` | Runtime | Client | package used; vulnerable path not shown reachable | Core React hooks for EVM blockchains. |
| 25 | `@rainbow-me/rainbowkit` | Moderate | Direct dependency | Runtime | Client | package used; vulnerable path not shown reachable | RainbowKit UI library pinned to `2.2.11`. Upstream wagmi 3.x upgrade planned when stable. |

---

## 2. Bundling Proof: `@coinbase/cdp-sdk` Stub Alias

### Physical Dependency Path
```
$ npm ls @coinbase/cdp-sdk
raseed@0.1.0 /Users/arpitbhardwaj/defi
└─┬ wagmi@2.19.5
  └─┬ @wagmi/connectors@6.2.0
    └─┬ @base-org/account@2.4.0
      └── @coinbase/cdp-sdk@1.58.0
```

### Bundler Stub Configuration (`next.config.ts`)
```ts
turbopack: {
  resolveAlias: {
    "@coinbase/cdp-sdk": "./src/lib/mocks/empty.ts",
  },
},
webpack: (config) => {
  config.resolve.alias = {
    ...config.resolve.alias,
    "@coinbase/cdp-sdk": false,
  };
  return config;
},
```

### Build Artifact Verification Evidence
In `.next/dev/server/chunks/ssr/src_lib_mocks_empty_ts_*.js`:
```js
class CdpClient {}
const empty = { CdpClient };
export default empty;
```
Source map confirms resolution directly to `file:///Users/arpitbhardwaj/defi/src/lib/mocks/empty.ts`. Zero native binaries, zero telemetry, and zero Coinbase RPC client code are included in the build output.

---

## 3. Contracts Dependency Hygiene (`contracts/lib/*`)

### Vendored Status
The files located in `contracts/lib/*` are **vendored copies committed directly into the main repository tree** (there is no `.gitmodules` file in the repository root).

### Exact Recorded Versions
1. **`forge-std`**:
   - Package Version: `v1.17.0` (as declared in `contracts/lib/forge-std/package.json`)
   - Vendor Path: `contracts/lib/forge-std/`
2. **`openzeppelin-contracts`**:
   - Package Version: `v5.0.2` (`openzeppelin-solidity` v5.0.2, as declared in `contracts/lib/openzeppelin-contracts/package.json`)
   - Vendor Path: `contracts/lib/openzeppelin-contracts/`

### Cleanest Pinning Proposal (Proposal Only — Do Not Apply)
The cleanest way to pin these dependencies in the future without unversioned vendored bloat:
1. **Option A (Foundry Git Submodules)**:
   Add `.gitmodules` explicitly pinned to immutable release tags:
   ```bash
   git submodule add -b v1.17.0 https://github.com/foundry-rs/forge-std contracts/lib/forge-std
   git submodule add -b v5.0.2 https://github.com/OpenZeppelin/openzeppelin-contracts contracts/lib/openzeppelin-contracts
   ```
2. **Option B (NPM Package Remappings)**:
   Install `@openzeppelin/contracts@5.0.2` via `package.json` and configure `remappings.txt`:
   ```
   @openzeppelin/contracts/=node_modules/@openzeppelin/contracts/
   forge-std/=node_modules/forge-std/src/
   ```

### Full `forge test` Suite Output
Executed via Foundry v1.8.5:
```
Ran 28 tests for test/PaymentRouter.t.sol:PaymentRouterTest
[PASS] testFuzz_FeeMath(uint256,uint256) (runs: 256, μ: 247906, ~: 248949)
[PASS] testFuzz_Pay(uint256,address) (runs: 256, μ: 175641, ~: 175582)
[PASS] test_AttackerDustPaymentToVictimMerchant_DoesNotBlockRealPayer() (gas: 309193)
[PASS] test_Constructor_InitialState() (gas: 40096)
[PASS] test_Constructor_RevertIf_ZeroOwner() (gas: 8978)
[PASS] test_Constructor_RevertIf_ZeroTreasury() (gas: 8555)
[PASS] test_Constructor_RevertIf_ZeroUSDC() (gas: 8567)
[PASS] test_FeeCap_HardEnforced() (gas: 88244)
[PASS] test_FeeOnTransferToken_HandlingAndArchitectureRestriction() (gas: 827697)
[PASS] test_Invariant_RouterBalanceAlwaysZero() (gas: 141797)
[PASS] test_Ownable2Step_TransferWorkflow() (gas: 104299)
[PASS] test_PayWithPermit_FrontrunSignature_StillSucceeds() (gas: 220243)
[PASS] test_PayWithPermit_HappyPath() (gas: 149536)
[PASS] test_PayWithPermit_PermitInvalid_AllowanceSufficient_Succeeds() (gas: 171737)
[PASS] test_Pay_HappyPath_ZeroFee() (gas: 154605)
[PASS] test_Pay_WithFee() (gas: 236818)
[PASS] test_RevertIf_InsufficientAllowance() (gas: 101156)
[PASS] test_RevertIf_MerchantIsRouter() (gas: 90378)
[PASS] test_RevertIf_NonOwnerSetsFee() (gas: 34883)
[PASS] test_RevertIf_NonOwnerSetsTreasury() (gas: 37058)
[PASS] test_RevertIf_PermitInvalidAndAllowanceInsufficient() (gas: 74891)
[PASS] test_RevertIf_ReentrancyAttack() (gas: 964936)
[PASS] test_RevertIf_SetTreasuryZeroAddress() (gas: 34487)
[PASS] test_RevertIf_TokenTransferReturnsFalse() (gas: 783606)
[PASS] test_RevertIf_ZeroAmount() (gas: 92501)
[PASS] test_RevertIf_ZeroMerchant() (gas: 90111)
[PASS] test_SamePayerSameInvoiceIdTwice_SucceedsTwiceAndEmitsTwoEvents() (gas: 201108)
[PASS] test_SetTreasury() (gas: 49695)
Suite result: ok. 28 passed; 0 failed; 0 skipped; finished in 25.41ms

Ran 1 test for test/PaymentRouterInvariant.t.sol:PaymentRouterInvariantTest
[PASS] invariant_RouterBalanceIsAlwaysZero() (runs: 256, calls: 128000, reverts: 71080)
Suite result: ok. 1 passed; 0 failed; 0 skipped; finished in 6.49s

Ran 2 test suites: 29 tests passed, 0 failed, 0 skipped (29 total tests)
```
