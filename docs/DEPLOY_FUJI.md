# Avalanche Fuji Testnet Deployment Guide (DEPLOY_FUJI.md)

This step-by-step guide walks you through deploying and verifying the **PaymentRouter** smart contract on the **Avalanche Fuji Testnet** (`chainId: 43113`) using an encrypted **Foundry Keystore** account (`cast wallet import` + `--account`).

---

## 1. Prerequisites & Faucets

### 1.1. Create & Encrypt a Fresh Deployer Keystore
Generate a dedicated testnet key pair and store it in an encrypted keystore (`~/.foundry/keystores/`):

```bash
# 1. Generate a new private key and address
cast wallet new

# 2. Import the private key into Foundry's encrypted keystore
cast wallet import fuji-deployer --interactive
# (Paste your private key when prompted, and set a strong keystore password)

# 3. Check and confirm the derived address
cast wallet address --account fuji-deployer
```

> [!IMPORTANT]
> **Shell History Hygiene**:
> Clear sensitive shell history after pasting private keys:
> ```bash
> history -c && history -w
> ```
> Or run keystore commands with a leading space if `HISTCONTROL=ignorespace` is active.

### 1.2. Fund the Keystore Address with Testnet AVAX
Request testnet AVAX for the address printed above to pay for transaction gas:
* **Core Faucet**: [https://core.app/tools/testnet-faucet/?subnet=c&token=c](https://core.app/tools/testnet-faucet/?subnet=c&token=c)
* **Avalanche Testnet Faucet**: [https://faucet.avax.network/](https://faucet.avax.network/)

### 1.3. Get Testnet USDC (for Payment Testing)
Request native Fuji USDC directly to your test payer wallet from Circle's testnet faucet:
* **Circle Testnet Faucet**: [https://faucet.circle.com/](https://faucet.circle.com/) (Select Avalanche Fuji)
* Canonical Fuji USDC Address: `0x5425890298aed601595a70AB815c96711a31Bc65`

### 1.4. (Optional) Snowtrace API Key
If you want automatic verification on Snowtrace during deployment, create a free API key at [https://testnet.snowtrace.io](https://testnet.snowtrace.io).

---

## 2. Environment Variables

Only non-sensitive configuration values need to be exported. The deployer private key is **never** exported as plain text in the shell:

```bash
cd /Users/arpitbhardwaj/defi/contracts

# Optional: Snowtrace API key for auto-verification
export SNOWTRACE_API_KEY="YOUR_SNOWTRACE_API_KEY"

# Optional: Separate treasury and owner addresses (defaults to deployer address if unset)
# export TREASURY_ADDRESS="0xYourTreasuryAddress"
# export OWNER_ADDRESS="0xYourOwnerAddress"
```

---

## 3. Step 1: Dry-Run Simulation

Run a dry run against Fuji RPC using your encrypted keystore:

```bash
forge script script/DeployFuji.s.sol \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --account fuji-deployer \
  -vvvv
```

Foundry will prompt for the password of your `fuji-deployer` keystore.
The script checks that:
- Deployer is **NOT** the default Anvil address (`0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`).
- USDC is pinned to canonical Circle Fuji USDC (`0x5425890298aed601595a70AB815c96711a31Bc65`).
- Deployer has sufficient AVAX for gas.

---

## 4. Step 2: Broadcast Live Deployment & Verify

Once simulation succeeds, broadcast the deployment to Avalanche Fuji testnet:

### With Automatic Snowtrace Verification:
```bash
forge script script/DeployFuji.s.sol \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --account fuji-deployer \
  --sender $(cast wallet address --account fuji-deployer) \
  --broadcast \
  --verify \
  -vvv
```

### Without Snowtrace Verification:
```bash
forge script script/DeployFuji.s.sol \
  --rpc-url https://api.avax-test.network/ext/bc/C/rpc \
  --account fuji-deployer \
  --sender $(cast wallet address --account fuji-deployer) \
  --broadcast \
  -vvv
```

---

## 5. Step 3: Record Deployed Address in Configuration

Copy the deployed `PaymentRouter` address from the terminal logs:

1. Update `contracts/deployments.json`:
```json
{
  "fuji": {
    "chainId": 43113,
    "networkName": "Avalanche Fuji Testnet",
    "rpcUrl": "https://api.avax-test.network/ext/bc/C/rpc",
    "explorerUrl": "https://testnet.snowtrace.io",
    "usdcAddress": "0x5425890298aed601595a70AB815c96711a31Bc65",
    "usdcDecimals": 6,
    "routerAddress": "<PASTE_YOUR_DEPLOYED_ROUTER_ADDRESS_HERE>"
  }
}
```

2. Update your `.env.local` file at the root of the project:
```env
NEXT_PUBLIC_NETWORK=fuji
NEXT_PUBLIC_FUJI_ROUTER_ADDRESS=<PASTE_YOUR_DEPLOYED_ROUTER_ADDRESS_HERE>
```

---

## 6. Step 4: On-Chain Sanity Verification

Verify contract state on Fuji using `cast`:

```bash
# Check configured USDC token matches Circle Fuji USDC
cast call <YOUR_ROUTER_ADDRESS> "usdc()(address)" --rpc-url https://api.avax-test.network/ext/bc/C/rpc

# Check initial fee rate is 0 bps
cast call <YOUR_ROUTER_ADDRESS> "feeBps()(uint256)" --rpc-url https://api.avax-test.network/ext/bc/C/rpc

# Check contract owner
cast call <YOUR_ROUTER_ADDRESS> "owner()(address)" --rpc-url https://api.avax-test.network/ext/bc/C/rpc
```
