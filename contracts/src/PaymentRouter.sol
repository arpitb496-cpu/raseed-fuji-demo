// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IPaymentRouter} from "./interfaces/IPaymentRouter.sol";

/// @title PaymentRouter
/// @notice Non-custodial, peer-to-peer payment routing contract for USDC on Avalanche C-Chain.
/// @dev Payer transfers go directly from payer to merchant (and treasury for fee).
///      The router contract is completely STATELESS regarding invoice settlement:
///      it holds no per-invoice state and holds ZERO token balance.
///      Invoice settlement is verified off-chain by observing canonical on-chain Paid events.
contract PaymentRouter is IPaymentRouter, ReentrancyGuard, Ownable2Step {
    using SafeERC20 for IERC20;

    /// @notice Maximum protocol fee allowed: 100 basis points (1.00%).
    uint256 public constant MAX_FEE_BPS = 100;

    /// @notice Fixed basis point denominator: 10,000 = 100%.
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice The allowlisted Circle native USDC token contract.
    IERC20 public immutable usdc;

    /// @notice Destination address for optional protocol fees.
    address public treasury;

    /// @notice Current protocol fee in basis points (e.g. 0 = 0%, 10 = 0.10%).
    uint256 public feeBps;

    /// @notice Initializes the router contract.
    /// @param _usdc Official Circle USDC contract address.
    /// @param _treasury Initial protocol treasury address.
    /// @param initialOwner Initial admin / multisig owner address.
    constructor(address _usdc, address _treasury, address initialOwner) Ownable(initialOwner) {
        if (_usdc == address(0) || _treasury == address(0) || initialOwner == address(0)) {
            revert ZeroAddress();
        }

        usdc = IERC20(_usdc);
        treasury = _treasury;
        feeBps = 0; // Fee starts at 0% by default
    }

    /// @notice Settles an invoice payment by transferring USDC directly from payer to merchant.
    /// @dev Requires prior approval of `amount` USDC to this contract.
    /// @param invoiceId Keccak256 hash representing the invoice identifier.
    /// @param merchant Payout destination address for the merchant.
    /// @param amount Total invoice amount in micro-USDC (6 decimals).
    function pay(bytes32 invoiceId, address merchant, uint256 amount) external nonReentrant {
        _settlePayment(invoiceId, merchant, amount);
    }

    /// @notice Settles an invoice payment via EIP-2612 gasless permit approval and payment in a single tx.
    /// @param invoiceId Keccak256 hash representing the invoice identifier.
    /// @param merchant Payout destination address for the merchant.
    /// @param amount Total invoice amount in micro-USDC (6 decimals).
    /// @param deadline Permit expiration timestamp.
    /// @param v ECDSA signature v component.
    /// @param r ECDSA signature r component.
    /// @param s ECDSA signature s component.
    function payWithPermit(
        bytes32 invoiceId,
        address merchant,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        // Try/catch permit to prevent front-run signature replay denial of service
        try IERC20Permit(address(usdc)).permit(msg.sender, address(this), amount, deadline, v, r, s) {} catch {}

        // Verify that the router now holds sufficient allowance to transfer the requested amount
        if (usdc.allowance(msg.sender, address(this)) < amount) {
            revert InsufficientAllowance();
        }

        _settlePayment(invoiceId, merchant, amount);
    }

    /// @notice Updates the protocol fee in basis points. Hard-capped at 100 bps (1%).
    /// @dev Restricted to contract owner (Safe multisig in production).
    /// @param newFeeBps New fee rate in basis points (0 to 100).
    function setFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) {
            revert FeeTooHigh(newFeeBps, MAX_FEE_BPS);
        }
        uint256 oldFee = feeBps;
        feeBps = newFeeBps;
        emit FeeUpdated(oldFee, newFeeBps);
    }

    /// @notice Updates the protocol treasury destination address.
    /// @dev Restricted to contract owner (Safe multisig in production).
    /// @param newTreasury New treasury address.
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) {
            revert ZeroAddress();
        }
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /// @dev Internal payment settlement logic.
    function _settlePayment(bytes32 invoiceId, address merchant, uint256 amount) internal {
        if (merchant == address(0) || merchant == address(this)) {
            revert InvalidMerchant();
        }
        if (amount == 0) {
            revert ZeroAmount();
        }

        uint256 fee = 0;
        uint256 merchantAmount = amount;

        if (feeBps > 0) {
            fee = (amount * feeBps) / BPS_DENOMINATOR;
            merchantAmount = amount - fee;
        }

        if (fee > 0) {
            usdc.safeTransferFrom(msg.sender, treasury, fee);
        }

        usdc.safeTransferFrom(msg.sender, merchant, merchantAmount);

        // Emit Paid event after token transfers
        emit Paid(invoiceId, msg.sender, merchant, amount, fee);
    }
}
