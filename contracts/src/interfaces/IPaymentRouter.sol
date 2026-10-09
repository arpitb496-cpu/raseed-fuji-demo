// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IPaymentRouter
/// @notice Interface for Raseed Protocol's zero-custody, stateless stablecoin payment router.
/// @dev The contract holds zero balances and maintains no per-invoice settlement state.
///      Invoice settlement accounting is verified and tracked off-chain.
interface IPaymentRouter {
    // --- Custom Errors ---
    error ZeroAddress();
    error ZeroAmount();
    error InvalidMerchant();
    error FeeTooHigh(uint256 feeBps, uint256 maxFeeBps);
    error InvalidTreasury();
    error BalanceMismatch();
    error InsufficientAllowance();

    // --- Events ---
    event Paid(bytes32 indexed invoiceId, address indexed payer, address indexed merchant, uint256 amount, uint256 fee);

    event FeeUpdated(uint256 oldFeeBps, uint256 newFeeBps);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    // --- Core Functions ---
    function pay(bytes32 invoiceId, address merchant, uint256 amount) external;

    function payWithPermit(
        bytes32 invoiceId,
        address merchant,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    // --- Admin Functions ---
    function setFee(uint256 newFeeBps) external;
    function setTreasury(address newTreasury) external;

    // --- View Functions ---
    function usdc() external view returns (IERC20);
    function treasury() external view returns (address);
    function feeBps() external view returns (uint256);
    function MAX_FEE_BPS() external view returns (uint256);
}
