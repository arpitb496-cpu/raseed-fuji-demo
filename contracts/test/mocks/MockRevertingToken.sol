// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockRevertingToken
/// @notice Token that returns false on transferFrom to test SafeERC20 revert handling.
contract MockRevertingToken is ERC20 {
    bool public shouldFail;

    constructor() ERC20("Reverting Token", "REV") {}

    function setShouldFail(bool _fail) external {
        shouldFail = _fail;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (shouldFail) {
            return false;
        }
        return super.transferFrom(from, to, amount);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
