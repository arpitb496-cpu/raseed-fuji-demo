# Dependency Risk Assessment & Accepted Risks (DEPENDENCY_RISK.md)

This document tracks security advisories identified via `npm audit --omit=dev`, architectural mitigations, and accepted risks.

---

## 1. High-Severity Vulnerability Analysis (`npm audit --omit=dev`)

### `deepmerge-ts` (< 8.0.0) — GHSA-ggr8-5vv4-36mx
* **Severity**: High (CWE-674: Uncontrolled Recursion / Stack Exhaustion)
* **Dependency Path**:
  ```
  raseed
  └── prisma (devDependency / CLI tooling)
      └── @prisma/config
          └── deepmerge-ts
  ```
* **Attack Vector Analysis**:
  - `deepmerge-ts` is invoked solely at compile-time/development-time when Prisma CLI parses config files (`prisma.config.ts`).
  - It is NOT part of the runtime production bundle or HTTP request handling path (runtime uses `@prisma/client` engine binaries).
  - An exploit requires an attacker to control the Prisma CLI configuration file, which requires repository write access.
* **Remediation & Decision**:
  - The suggested npm fix (`npm audit fix --force`) forces a major downgrade to `prisma@6.12.0`, which causes breaking changes with current PostgreSQL schema generators.
  - **Accepted Risk**: Risk accepted for Prisma CLI build tooling. Zero runtime exploitability in Next.js production server.

---

## 2. Moderate-Severity Vulnerabilities (Transitive Web3 SDKs)

### `uuid` (< 11.1.1) — GHSA-w5hq-g745-h8pq
* **Severity**: Moderate (CWE-787, CWE-1285)
* **Dependency Path**:
  ```
  raseed
  └── @rainbow-me/rainbowkit
      └── wagmi
          └── @wagmi/connectors
              └── @metamask/sdk
                  └── uuid
  ```
* **Attack Vector Analysis**:
  - Occurs only if user-supplied byte buffers are passed to `uuid.v3/v5/v6`. Raseed does not expose or call MetaMask SDK internal UUID APIs directly.
* **Remediation & Decision**:
  - Upstream fix requires `wagmi@3.x`, which represents a major breaking rewrite of RainbowKit wallet providers.
  - **Accepted Risk**: Upstream maintenance tracked; runtime exposure is non-existent.

### `decode-uri-component` (<= 0.4.2) — GHSA-vcc3-ghjq-m6fr
* **Severity**: Moderate (CWE-400 / ReDoS)
* **Dependency Path**:
  ```
  raseed
  └── @rainbow-me/rainbowkit
      └── wagmi
          └── @wagmi/connectors
              └── @walletconnect/ethereum-provider
                  └── query-string
                      └── decode-uri-component
  ```
* **Attack Vector Analysis**:
  - Pertains to URI query string decoding inside WalletConnect URI pairing strings.
* **Remediation & Decision**:
  - WalletConnect pairing URIs are validated client-side and handled strictly inside WalletConnect SDK modals.
  - **Accepted Risk**: Accepted until `@rainbow-me/rainbowkit` updates transitive WalletConnect client.

---

## 3. Workaround Record: `@coinbase/cdp-sdk` Stub Workaround

* **Context & Issue**:
  Certain Wagmi / Web3 connector builds and Next.js Turbopack bundling previously attempted optional module resolution for `@coinbase/cdp-sdk` (Coinbase Developer Platform SDK) and `@coinbase/wallet-sdk`. This caused build failures when non-Base/non-Coinbase chains are deployed, or pulled unnecessary heavy Coinbase backend telemetry.
* **Architecture Solution**:
  1. **Strict Connector List**: Raseed explicitly restricts RainbowKit connectors to `[coreWallet, metaMaskWallet, rabbyWallet, injectedWallet, walletConnectWallet]` in `src/components/providers/Web3Provider.tsx`.
  2. **Exclusion of Coinbase Connectors**: No Coinbase or Base wallet connector is registered in Wagmi config.
  3. **Zero Coinbase Dependency**: `@coinbase/cdp-sdk` is entirely removed from `package.json`. No Coinbase telemetry, API keys, or SDK stubs are loaded into the client runtime.
  4. **Compliance Verification**: Tested and continuously asserted via `tests/wallet-connectors.test.ts`.
