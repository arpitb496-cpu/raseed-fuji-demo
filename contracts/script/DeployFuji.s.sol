// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PaymentRouter} from "../src/PaymentRouter.sol";

/// @title DeployFuji
/// @notice Deployment script for PaymentRouter on Avalanche Fuji Testnet (Chain ID 43113).
/// @dev Always deployed via encrypted keystore (--account <name>). msg.sender is the broadcast deployer.
contract DeployFuji is Script {
    // Official native Circle USDC address on Avalanche Fuji Testnet (Source: Circle official docs)
    address public constant FUJI_USDC = 0x5425890298aed601595a70AB815c96711a31Bc65;

    // Known default Anvil / Hardhat address #0: MUST NEVER be used for testnet or mainnet deployments
    address public constant ANVIL_DEFAULT_ADDRESS = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    function run() external returns (PaymentRouter router) {
        address deployer = msg.sender;

        require(
            deployer != ANVIL_DEFAULT_ADDRESS,
            "SECURITY ERROR: Deployer cannot be the default Anvil test address (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266). Please supply a unique keystore account or key."
        );
        require(deployer != address(0), "SECURITY ERROR: Deployer address cannot be address(0).");

        address treasury = vm.envOr("TREASURY_ADDRESS", deployer);
        address owner = vm.envOr("OWNER_ADDRESS", deployer);

        console2.log("=== Deploying PaymentRouter to Avalanche Fuji ===");
        console2.log("Deployer (msg.sender):", deployer);
        console2.log("USDC (Circle Fuji):", FUJI_USDC);
        console2.log("Treasury:", treasury);
        console2.log("Owner:", owner);

        vm.startBroadcast();

        router = new PaymentRouter(FUJI_USDC, treasury, owner);

        vm.stopBroadcast();

        console2.log("PaymentRouter successfully deployed at:", address(router));
        console2.log("Verify with:");
        console2.log(
            string.concat(
                "forge verify-contract --chain-id 43113 ",
                vm.toString(address(router)),
                " src/PaymentRouter.sol:PaymentRouter --constructor-args $(cast abi-encode \"constructor(address,address,address)\" ",
                vm.toString(FUJI_USDC),
                " ",
                vm.toString(treasury),
                " ",
                vm.toString(owner),
                ")"
            )
        );
    }
}
