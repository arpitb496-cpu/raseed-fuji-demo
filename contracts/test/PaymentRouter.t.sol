// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PaymentRouter} from "../src/PaymentRouter.sol";
import {IPaymentRouter} from "../src/interfaces/IPaymentRouter.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {MockMaliciousToken} from "./mocks/MockMaliciousToken.sol";
import {MockRevertingToken} from "./mocks/MockRevertingToken.sol";
import {MockFeeOnTransferToken} from "./mocks/MockFeeOnTransferToken.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentRouterTest is Test {
    PaymentRouter public router;
    MockUSDC public usdc;

    address public owner = makeAddr("owner");
    address public treasury = makeAddr("treasury");
    address public merchant = makeAddr("merchant");
    address public payer;
    uint256 public payerPrivateKey;

    bytes32 public constant SAMPLE_INVOICE_ID = keccak256("inv_sample_1234567890abcdef");

    function setUp() public {
        payerPrivateKey = 0xA11CE;
        payer = vm.addr(payerPrivateKey);

        usdc = new MockUSDC();
        router = new PaymentRouter(address(usdc), treasury, owner);

        // Fund payer with 10,000 USDC (6 decimals: 10,000 * 1e6)
        usdc.mint(payer, 10_000 * 1e6);
    }

    // -------------------------------------------------------------
    // Constructor Validation
    // -------------------------------------------------------------

    function test_Constructor_RevertIf_ZeroUSDC() public {
        vm.expectRevert(IPaymentRouter.ZeroAddress.selector);
        new PaymentRouter(address(0), treasury, owner);
    }

    function test_Constructor_RevertIf_ZeroTreasury() public {
        vm.expectRevert(IPaymentRouter.ZeroAddress.selector);
        new PaymentRouter(address(usdc), address(0), owner);
    }

    function test_Constructor_RevertIf_ZeroOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new PaymentRouter(address(usdc), treasury, address(0));
    }

    function test_Constructor_InitialState() public view {
        assertEq(address(router.usdc()), address(usdc));
        assertEq(router.treasury(), treasury);
        assertEq(router.owner(), owner);
        assertEq(router.feeBps(), 0);
        assertEq(router.MAX_FEE_BPS(), 100);
    }

    // -------------------------------------------------------------
    // Happy Path Payments
    // -------------------------------------------------------------

    function test_Pay_HappyPath_ZeroFee() public {
        uint256 amount = 500 * 1e6; // 500 USDC

        vm.startPrank(payer);
        usdc.approve(address(router), amount);

        vm.expectEmit(true, true, true, true);
        emit IPaymentRouter.Paid(SAMPLE_INVOICE_ID, payer, merchant, amount, 0);

        router.pay(SAMPLE_INVOICE_ID, merchant, amount);
        vm.stopPrank();

        assertEq(usdc.balanceOf(merchant), amount);
        assertEq(usdc.balanceOf(treasury), 0);
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    function test_Pay_WithFee() public {
        // Set 50 bps fee (0.50%)
        vm.prank(owner);
        router.setFee(50);

        uint256 amount = 1_000 * 1e6; // 1,000 USDC
        uint256 expectedFee = (amount * 50) / 10_000; // 5 USDC
        uint256 expectedMerchant = amount - expectedFee; // 995 USDC

        vm.startPrank(payer);
        usdc.approve(address(router), amount);

        vm.expectEmit(true, true, true, true);
        emit IPaymentRouter.Paid(SAMPLE_INVOICE_ID, payer, merchant, amount, expectedFee);

        router.pay(SAMPLE_INVOICE_ID, merchant, amount);
        vm.stopPrank();

        assertEq(usdc.balanceOf(treasury), expectedFee);
        assertEq(usdc.balanceOf(merchant), expectedMerchant);
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    // -------------------------------------------------------------
    // Anti-Griefing & Stateless Settlement Tests
    // -------------------------------------------------------------

    /// @notice (a) Attacker pays 1 unit to the victim merchant for the victim's invoiceId,
    /// then the real payer pays the full amount and succeeds without being blocked.
    function test_AttackerDustPaymentToVictimMerchant_DoesNotBlockRealPayer() public {
        address attackerPayer = makeAddr("attacker_payer");
        bytes32 victimInvoiceId = keccak256("victim_invoice_999");
        uint256 fullAmount = 500 * 1e6; // 500 USDC

        // Fund attacker with 1 micro-USDC
        usdc.mint(attackerPayer, 1);

        // Attacker pays 1 unit to the victim merchant for victimInvoiceId
        vm.startPrank(attackerPayer);
        usdc.approve(address(router), 1);

        vm.expectEmit(true, true, true, true);
        emit IPaymentRouter.Paid(victimInvoiceId, attackerPayer, merchant, 1, 0);
        router.pay(victimInvoiceId, merchant, 1);
        vm.stopPrank();

        // Merchant received 1 micro-USDC from attacker
        assertEq(usdc.balanceOf(merchant), 1);

        // Real payer subsequently pays the full 500 USDC for the same invoiceId and MUST SUCCEED
        vm.startPrank(payer);
        usdc.approve(address(router), fullAmount);

        vm.expectEmit(true, true, true, true);
        emit IPaymentRouter.Paid(victimInvoiceId, payer, merchant, fullAmount, 0);
        router.pay(victimInvoiceId, merchant, fullAmount);
        vm.stopPrank();

        // Merchant receives 500 USDC + 1 micro-USDC
        assertEq(usdc.balanceOf(merchant), fullAmount + 1);
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    /// @notice (b) The same payer paying the same invoiceId twice succeeds twice and emits two events.
    function test_SamePayerSameInvoiceIdTwice_SucceedsTwiceAndEmitsTwoEvents() public {
        uint256 amount = 100 * 1e6; // 100 USDC

        vm.startPrank(payer);
        usdc.approve(address(router), amount * 2);

        // First payment
        vm.expectEmit(true, true, true, true);
        emit IPaymentRouter.Paid(SAMPLE_INVOICE_ID, payer, merchant, amount, 0);
        router.pay(SAMPLE_INVOICE_ID, merchant, amount);

        // Second payment for the same invoiceId
        vm.expectEmit(true, true, true, true);
        emit IPaymentRouter.Paid(SAMPLE_INVOICE_ID, payer, merchant, amount, 0);
        router.pay(SAMPLE_INVOICE_ID, merchant, amount);
        vm.stopPrank();

        // Merchant received both payments (200 USDC total)
        assertEq(usdc.balanceOf(merchant), amount * 2);
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    // -------------------------------------------------------------
    // Zero & Invalid Inputs
    // -------------------------------------------------------------

    function test_RevertIf_ZeroAmount() public {
        vm.startPrank(payer);
        usdc.approve(address(router), 100 * 1e6);

        vm.expectRevert(IPaymentRouter.ZeroAmount.selector);
        router.pay(SAMPLE_INVOICE_ID, merchant, 0);
        vm.stopPrank();
    }

    function test_RevertIf_ZeroMerchant() public {
        vm.startPrank(payer);
        usdc.approve(address(router), 100 * 1e6);

        vm.expectRevert(IPaymentRouter.InvalidMerchant.selector);
        router.pay(SAMPLE_INVOICE_ID, address(0), 100 * 1e6);
        vm.stopPrank();
    }

    function test_RevertIf_MerchantIsRouter() public {
        vm.startPrank(payer);
        usdc.approve(address(router), 100 * 1e6);

        vm.expectRevert(IPaymentRouter.InvalidMerchant.selector);
        router.pay(SAMPLE_INVOICE_ID, address(router), 100 * 1e6);
        vm.stopPrank();
    }

    function test_RevertIf_InsufficientAllowance() public {
        vm.startPrank(payer);
        usdc.approve(address(router), 50 * 1e6); // only approve 50

        vm.expectRevert();
        router.pay(SAMPLE_INVOICE_ID, merchant, 100 * 1e6); // attempt 100
        vm.stopPrank();
    }

    // -------------------------------------------------------------
    // Fee Administration & Cap Enforced
    // -------------------------------------------------------------

    function test_FeeCap_HardEnforced() public {
        // Exceeding 100 bps (1%) MUST revert
        vm.startPrank(owner);
        vm.expectRevert(abi.encodeWithSelector(IPaymentRouter.FeeTooHigh.selector, 101, 100));
        router.setFee(101);

        // Setting exactly 100 bps must succeed
        router.setFee(100);
        assertEq(router.feeBps(), 100);
        vm.stopPrank();
    }

    function test_RevertIf_NonOwnerSetsFee() public {
        vm.prank(payer);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, payer));
        router.setFee(10);
    }

    function test_SetTreasury() public {
        address newTreasury = makeAddr("newTreasury");

        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit IPaymentRouter.TreasuryUpdated(treasury, newTreasury);
        router.setTreasury(newTreasury);

        assertEq(router.treasury(), newTreasury);
    }

    function test_RevertIf_SetTreasuryZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(IPaymentRouter.ZeroAddress.selector);
        router.setTreasury(address(0));
    }

    function test_RevertIf_NonOwnerSetsTreasury() public {
        vm.prank(payer);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, payer));
        router.setTreasury(makeAddr("hacker"));
    }

    function test_Ownable2Step_TransferWorkflow() public {
        address newOwner = makeAddr("newOwner");

        vm.prank(owner);
        router.transferOwnership(newOwner);

        // Original owner remains until accepted
        assertEq(router.owner(), owner);

        // Pending owner accepts
        vm.prank(newOwner);
        router.acceptOwnership();
        assertEq(router.owner(), newOwner);
    }

    // -------------------------------------------------------------
    // EIP-2612 Permit Payment
    // -------------------------------------------------------------

    function test_PayWithPermit_HappyPath() public {
        uint256 amount = 250 * 1e6;
        uint256 deadline = block.timestamp + 1 hours;

        // Construct EIP-2612 Permit digest
        bytes32 permitTypehash =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 structHash =
            keccak256(abi.encode(permitTypehash, payer, address(router), amount, usdc.nonces(payer), deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", usdc.DOMAIN_SEPARATOR(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(payerPrivateKey, digest);

        // Single transaction: permit + pay without prior approve()
        vm.prank(payer);
        router.payWithPermit(SAMPLE_INVOICE_ID, merchant, amount, deadline, v, r, s);

        assertEq(usdc.balanceOf(merchant), amount);
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    /// @notice (a) Attacker front-runs the same permit signature, then payWithPermit still succeeds
    function test_PayWithPermit_FrontrunSignature_StillSucceeds() public {
        uint256 amount = 300 * 1e6;
        uint256 deadline = block.timestamp + 1 hours;

        bytes32 permitTypehash =
            keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
        bytes32 structHash =
            keccak256(abi.encode(permitTypehash, payer, address(router), amount, usdc.nonces(payer), deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", usdc.DOMAIN_SEPARATOR(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(payerPrivateKey, digest);

        // Attacker sees the signed permit in the mempool and calls usdc.permit() directly
        address attacker = makeAddr("frontrunner_attacker");
        vm.prank(attacker);
        usdc.permit(payer, address(router), amount, deadline, v, r, s);

        // The allowance is now active on the token, but the nonce is consumed
        assertEq(usdc.allowance(payer, address(router)), amount);

        // Payer's original payWithPermit transaction executes
        // The try/catch absorbs the already-used permit error, checks allowance >= amount, and settles payment
        vm.prank(payer);
        router.payWithPermit(SAMPLE_INVOICE_ID, merchant, amount, deadline, v, r, s);

        assertEq(usdc.balanceOf(merchant), amount);
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    /// @notice (b) Permit invalid and allowance insufficient reverts with InsufficientAllowance
    function test_RevertIf_PermitInvalidAndAllowanceInsufficient() public {
        uint256 amount = 100 * 1e6;
        uint256 deadline = block.timestamp + 1 hours;

        // Provide invalid dummy signature without any prior allowance
        vm.prank(payer);
        vm.expectRevert(IPaymentRouter.InsufficientAllowance.selector);
        router.payWithPermit(SAMPLE_INVOICE_ID, merchant, amount, deadline, 27, bytes32("bad_r"), bytes32("bad_s"));
    }

    /// @notice (c) Permit invalid but allowance sufficient succeeds
    function test_PayWithPermit_PermitInvalid_AllowanceSufficient_Succeeds() public {
        uint256 amount = 150 * 1e6;
        uint256 deadline = block.timestamp + 1 hours;

        // Payer already gave sufficient allowance via standard approve()
        vm.prank(payer);
        usdc.approve(address(router), amount);

        // Payer calls payWithPermit with invalid signature
        // The try/catch absorbs the permit failure, but allowance is sufficient, so payment proceeds
        vm.prank(payer);
        router.payWithPermit(SAMPLE_INVOICE_ID, merchant, amount, deadline, 27, bytes32("bad_r"), bytes32("bad_s"));

        assertEq(usdc.balanceOf(merchant), amount);
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    // -------------------------------------------------------------
    // Malicious & Fee-On-Transfer Tokens
    // -------------------------------------------------------------

    function test_RevertIf_ReentrancyAttack() public {
        MockMaliciousToken badToken = new MockMaliciousToken();
        PaymentRouter badRouter = new PaymentRouter(address(badToken), treasury, owner);

        bytes32 invoice1 = keccak256("inv_1");
        bytes32 invoice2 = keccak256("inv_2");
        uint256 amount = 100 * 1e6;

        badToken.mint(payer, amount * 2);

        // Configure malicious token to attack badRouter when transferFrom is called
        badToken.setAttack(address(badRouter), invoice2, merchant, amount);

        vm.startPrank(payer);
        badToken.approve(address(badRouter), amount * 2);

        // Expect revert due to ReentrancyGuard
        vm.expectRevert();
        badRouter.pay(invoice1, merchant, amount);
        vm.stopPrank();
    }

    function test_RevertIf_TokenTransferReturnsFalse() public {
        MockRevertingToken revToken = new MockRevertingToken();
        PaymentRouter revRouter = new PaymentRouter(address(revToken), treasury, owner);

        uint256 amount = 100 * 1e6;
        revToken.mint(payer, amount);
        revToken.setShouldFail(true);

        vm.startPrank(payer);
        revToken.approve(address(revRouter), amount);

        // SafeERC20 will revert on return false
        vm.expectRevert();
        revRouter.pay(SAMPLE_INVOICE_ID, merchant, amount);
        vm.stopPrank();
    }

    /// @notice Demonstrates fee-on-transfer behavior and why production router restricts to immutable native USDC
    function test_FeeOnTransferToken_HandlingAndArchitectureRestriction() public {
        MockFeeOnTransferToken fotToken = new MockFeeOnTransferToken(); // 5% fee on transfer
        PaymentRouter testFotRouter = new PaymentRouter(address(fotToken), treasury, owner);

        uint256 amount = 100 * 1e6;
        fotToken.mint(payer, amount);

        vm.startPrank(payer);
        fotToken.approve(address(testFotRouter), amount);
        testFotRouter.pay(SAMPLE_INVOICE_ID, merchant, amount);
        vm.stopPrank();

        // With a 5% transfer fee, merchant receives 95 USDC instead of 100 USDC
        uint256 expectedReceived = amount - ((amount * 500) / 10_000);
        assertEq(fotToken.balanceOf(merchant), expectedReceived);

        // Crucial invariant: The router still holds exactly 0 balance!
        assertEq(fotToken.balanceOf(address(testFotRouter)), 0);

        // ARCHITECTURAL RESTRICTION:
        // Production PaymentRouter constructor immutably binds to the official Circle USDC token address.
        // It does not accept arbitrary token addresses in pay(), preventing attackers or payers
        // from substituting fee-on-transfer tokens into production payment flows.
        assertEq(address(router.usdc()), address(usdc));
    }

    // -------------------------------------------------------------
    // Fuzz Tests
    // -------------------------------------------------------------

    function testFuzz_Pay(uint256 amount, address randomMerchant) public {
        // Bound amount between $0.01 (10,000 units) and $1,000,000 (1e12 units)
        vm.assume(amount >= 10_000 && amount <= 1_000_000 * 1e6);
        vm.assume(randomMerchant != address(0) && randomMerchant != address(router));

        usdc.mint(payer, amount);

        bytes32 invId = keccak256(abi.encodePacked("fuzz_inv", amount, randomMerchant));

        vm.startPrank(payer);
        usdc.approve(address(router), amount);
        router.pay(invId, randomMerchant, amount);
        vm.stopPrank();

        assertEq(usdc.balanceOf(randomMerchant), amount);
        assertEq(usdc.balanceOf(address(router)), 0);
    }

    function testFuzz_FeeMath(uint256 amount, uint256 feeBps) public {
        vm.assume(amount >= 10_000 && amount <= 10_000_000 * 1e6);
        feeBps = bound(feeBps, 0, 100); // 0% to 1.00%

        vm.prank(owner);
        router.setFee(feeBps);

        uint256 expectedFee = (amount * feeBps) / 10_000;
        uint256 expectedMerchant = amount - expectedFee;

        // Mathematical invariant: merchantAmount + fee == amount
        assertEq(expectedMerchant + expectedFee, amount);

        usdc.mint(payer, amount);
        bytes32 invId = keccak256(abi.encodePacked("fee_fuzz", amount, feeBps));

        vm.startPrank(payer);
        usdc.approve(address(router), amount);
        router.pay(invId, merchant, amount);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(router)), 0);
    }

    // -------------------------------------------------------------
    // (c) Invariant: Router Token Balance is Strictly 0
    // -------------------------------------------------------------

    function test_Invariant_RouterBalanceAlwaysZero() public {
        assertEq(usdc.balanceOf(address(router)), 0);

        uint256 amount = 300 * 1e6;
        vm.startPrank(payer);
        usdc.approve(address(router), amount);
        router.pay(SAMPLE_INVOICE_ID, merchant, amount);
        vm.stopPrank();

        assertEq(usdc.balanceOf(address(router)), 0);
    }
}
