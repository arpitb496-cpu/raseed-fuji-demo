// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PaymentRouter} from "../src/PaymentRouter.sol";

/// @title DeployMainnet
/// @notice Deployment script for PaymentRouter on Avalanche C-Chain Mainnet (Chain ID 43114).
/// @dev Gated by CONFIRM_MAINNET_DEPLOY. Always deployed via encrypted keystore (--account <name>).
contract DeployMainnet is Script {
    // Official native Circle USDC address on Avalanche C-Chain Mainnet (Source: Circle official docs)
    address public constant MAINNET_USDC = 0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E;

    // Known default Anvil / Hardhat address #0: MUST NEVER be used for production or testnet
    address public constant ANVIL_DEFAULT_ADDRESS = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    function run() external returns (PaymentRouter router) {
        bool confirmed = vm.envOr("CONFIRM_MAINNET_DEPLOY", false);
        require(
            confirmed,
            "SAFETY CHECK FAILED: CONFIRM_MAINNET_DEPLOY=true must be explicitly passed to deploy to Mainnet."
        );

        address deployer = msg.sender;

        require(
            deployer != ANVIL_DEFAULT_ADDRESS,
            "SECURITY ERROR: Deployer cannot be the default Anvil address (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)."
        );
        require(deployer != address(0), "SECURITY ERROR: Deployer address cannot be address(0).");

        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address ownerSafe = vm.envAddress("OWNER_SAFE_ADDRESS");

        require(treasury != address(0), "Treasury address must be non-zero");
        require(ownerSafe != address(0), "Owner Safe address must be non-zero");
        require(ownerSafe != deployer, "Production owner must be a multisig Safe, not deployer EOA");

        console2.log("=== DEPLOYING PaymentRouter TO AVALANCHE MAINNET ===");
        console2.log("Deployer (msg.sender):", deployer);
        console2.log("USDC (Circle Mainnet):", MAINNET_USDC);
        console2.log("Treasury:", treasury);
        console2.log("Owner Safe:", ownerSafe);

        vm.startBroadcast();

        router = new PaymentRouter(MAINNET_USDC, treasury, ownerSafe);

        vm.stopBroadcast();

        console2.log("PaymentRouter deployed to Mainnet at:", address(router));
    }
}
