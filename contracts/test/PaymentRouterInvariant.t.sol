// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {StdInvariant} from "forge-std/StdInvariant.sol";
import {PaymentRouter} from "../src/PaymentRouter.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";

contract RouterHandler is Test {
    PaymentRouter public router;
    MockUSDC public usdc;

    address[] public merchants;
    address public payer;
    uint256 public nextInvoiceId = 1;

    constructor(PaymentRouter _router, MockUSDC _usdc) {
        router = _router;
        usdc = _usdc;

        payer = makeAddr("invariant_payer");
        merchants.push(makeAddr("merchant_1"));
        merchants.push(makeAddr("merchant_2"));
        merchants.push(makeAddr("merchant_3"));

        // Fund invariant payer with huge supply
        usdc.mint(payer, 100_000_000 * 1e6);

        vm.prank(payer);
        usdc.approve(address(router), type(uint256).max);
    }

    function executePayment(uint256 amount, uint256 merchantIdx) external {
        amount = bound(amount, 1 * 1e6, 1_000_000 * 1e6);
        address merchant = merchants[merchantIdx % merchants.length];

        bytes32 invoiceId = bytes32(nextInvoiceId++);

        vm.prank(payer);
        router.pay(invoiceId, merchant, amount);
    }
}

contract PaymentRouterInvariantTest is StdInvariant, Test {
    PaymentRouter public router;
    MockUSDC public usdc;
    RouterHandler public handler;

    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");

    function setUp() public {
        usdc = new MockUSDC();
        router = new PaymentRouter(address(usdc), treasury, owner);
        handler = new RouterHandler(router, usdc);

        targetContract(address(handler));
    }

    /// @notice Invariant: Router contract USDC balance must unconditionally be 0 across all states.
    function invariant_RouterBalanceIsAlwaysZero() public view {
        assertEq(usdc.balanceOf(address(router)), 0);
    }
}
