# Dependency Risk Assessment & Accepted Risks (DEPENDENCY_RISK.md)

This document tracks security advisories identified via `npm audit --omit=dev`, architectural mitigations, and accepted risks.

---

## 1. High-Severity Vulnerability Analysis (`npm audit --omit=dev`)

Current audit summary: `25 vulnerabilities (22 moderate, 3 high)`.

### `deepmerge-ts` (< 8.0.0) — GHSA-ggr8-5vv4-36mx
* **Severity**: High (CWE-674: Uncontrolled Recursion / Stack Exhaustion)
* **Dependency Path**:
  ```
  raseed@0.1.0
  └── prisma (devDependency / CLI tooling)
      └── @prisma/config
          └── deepmerge-ts
  ```
  *Note*: `npm audit` lists 3 high vulnerabilities corresponding to `deepmerge-ts` and its direct consumers (`@prisma/config`, `prisma`).
* **Attack Vector Analysis**:
  - `deepmerge-ts` is invoked exclusively when the Prisma CLI parses configuration files (`prisma.config.ts`).
  - It is NOT included in the runtime production Next.js bundle or HTTP request handling path (runtime uses `@prisma/client` engine binaries).
  - An exploit requires an attacker to supply a crafted recursive object structure to the Prisma CLI configuration file, which requires repository write access.
* **Remediation & Decision**:
  - The suggested automated fix (`npm audit fix --force`) forces a major downgrade of Prisma to `prisma@6.12.0`, which causes breaking changes with current PostgreSQL schema generators.
  - **Accepted Risk**: Risk accepted for Prisma CLI development tooling. Zero runtime exploitability in the Next.js production server.

---

## 2. Moderate-Severity Vulnerabilities (Transitive Web3 SDKs)

### `uuid` (< 11.1.1) — GHSA-w5hq-g745-h8pq
* **Severity**: Moderate (CWE-787, CWE-1285)
* **Dependency Path**:
  ```
  raseed@0.1.0
  └── @rainbow-me/rainbowkit
      └── wagmi
          └── @wagmi/connectors
              └── @metamask/sdk
                  └── uuid
  ```
* **Attack Vector Analysis**:
  - Vulnerability requires user-supplied byte buffers to be passed to `uuid.v3/v5/v6`. Raseed does not expose or call MetaMask SDK internal UUID APIs directly.
* **Remediation & Decision**:
  - Upstream fix requires `wagmi@3.x`, which introduces breaking API changes for RainbowKit wallet connectors.
  - **Accepted Risk**: Upstream maintenance tracked; runtime exposure is non-existent.

### `decode-uri-component` (<= 0.4.2) — GHSA-vcc3-ghjq-m6fr
* **Severity**: Moderate (CWE-400 / ReDoS)
* **Dependency Path**:
  ```
  raseed@0.1.0
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
  - **Accepted Risk**: Upstream maintenance tracked; runtime risk contained.

---

## 3. Reality of `@coinbase/cdp-sdk` Transitive Dependency

### Command Output: `npm ls @coinbase/cdp-sdk`
```
raseed@0.1.0 /Users/arpitbhardwaj/defi
└─┬ wagmi@2.19.5
  └─┬ @wagmi/connectors@6.2.0
    └─┬ @base-org/account@2.4.0
      └── @coinbase/cdp-sdk@1.58.0
```

### Verified Facts & Architecture
1. **Transitive Presence**: `@coinbase/cdp-sdk` is NOT a direct dependency in `package.json`. However, it is physically present in `node_modules` as a transitive dependency brought in by `@wagmi/connectors@6.2.0` via `@base-org/account@2.4.0`.
2. **Next.js / Bundler Alias**: Because `@base-org/account` references `@coinbase/cdp-sdk`, bundlers (Turbopack/Webpack) attempt to resolve it. In `next.config.ts`, we alias `@coinbase/cdp-sdk` to `./src/lib/mocks/empty.ts` (Turbopack) and `false` (Webpack) so that no Coinbase telemetry, heavy native modules, or network code are ever bundled.
3. **Explicit Connector List**: In `src/components/providers/Web3Provider.tsx`, the RainbowKit connector list explicitly allows only `[coreWallet, metaMaskWallet, rabbyWallet, injectedWallet, walletConnectWallet]`. No Coinbase Wallet connector or Base account connector is registered.
4. **Automated Assertion**: `tests/wallet-connectors.test.ts` asserts that the runtime connector list contains exactly the intended wallets and excludes any Coinbase connector.
