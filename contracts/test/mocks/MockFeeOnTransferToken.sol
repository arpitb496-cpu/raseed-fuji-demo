// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockFeeOnTransferToken
/// @notice Token that burns or deducts a fee upon transfer.
contract MockFeeOnTransferToken is ERC20 {
    uint256 public feeBps = 500; // 5% transfer fee

    constructor() ERC20("Fee On Transfer Token", "FOT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        uint256 fee = (amount * feeBps) / 10_000;
        uint256 netAmount = amount - fee;
        _spendAllowance(from, msg.sender, amount);
        _burn(from, fee);
        _transfer(from, to, netAmount);
        return true;
    }
}
