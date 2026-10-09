// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IPaymentRouter} from "../../src/interfaces/IPaymentRouter.sol";

/// @title MockMaliciousToken
/// @notice ERC20 token that attempts to re-enter PaymentRouter during transferFrom.
contract MockMaliciousToken is ERC20 {
    address public targetRouter;
    bytes32 public attackInvoiceId;
    address public attackMerchant;
    uint256 public attackAmount;
    bool public attackTriggered;

    constructor() ERC20("Malicious Token", "BAD") {}

    function setAttack(address _targetRouter, bytes32 _attackInvoiceId, address _attackMerchant, uint256 _attackAmount)
        external
    {
        targetRouter = _targetRouter;
        attackInvoiceId = _attackInvoiceId;
        attackMerchant = _attackMerchant;
        attackAmount = _attackAmount;
        attackTriggered = false;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (!attackTriggered && targetRouter != address(0)) {
            attackTriggered = true;
            // Attempt reentrancy attack on PaymentRouter
            IPaymentRouter(targetRouter).pay(attackInvoiceId, attackMerchant, attackAmount);
        }
        return super.transferFrom(from, to, amount);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
