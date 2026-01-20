// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/noahv2.sol";
import "./mocks/MockERC20.sol";

/**
 * @title NoahV2Test
 * @notice Comprehensive test suite for Noah contract (v2)
 */
contract NoahV2Test is Test {
    Noah public noahV2;
    MockERC20 public token1;
    MockERC20 public token2;
    MockERC20 public token3;

    address public user1;
    address public user2;
    address public beneficiary1;
    address public beneficiary2;

    uint256 constant DEADLINE_DURATION = 30 days;
    uint256 constant INITIAL_BALANCE = 1000 ether;

    event ArkBuilt(address indexed user, address indexed beneficiary, address indexed token, uint256 deadline);
    event ArkDestroyed(address indexed user, address indexed token);
    event ArkPinged(address indexed user, address indexed token, uint256 newDeadline);
    event FloodTriggered(address indexed user, address indexed beneficiary, address indexed token, uint256 tokenAmount);
    event DeadlineUpdated(address indexed user, uint256 newDuration, uint256 newDeadline);

    function setUp() public {
        noahV2 = new Noah();

        token1 = new MockERC20("Token1", "TK1");
        token2 = new MockERC20("Token2", "TK2");
        token3 = new MockERC20("Token3", "TK3");

        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        beneficiary1 = makeAddr("beneficiary1");
        beneficiary2 = makeAddr("beneficiary2");

        // Mint tokens to users
        token1.mint(user1, INITIAL_BALANCE);
        token2.mint(user1, INITIAL_BALANCE);
        token3.mint(user1, INITIAL_BALANCE);

        token1.mint(user2, INITIAL_BALANCE);
        token2.mint(user2, INITIAL_BALANCE);
    }

    // ===== buildArk Tests =====

    function test_BuildArk_Success() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(token1);
        tokens[1] = address(token2);

        vm.startPrank(user1);

        uint256 expectedDeadline = block.timestamp + DEADLINE_DURATION;

        vm.expectEmit(true, true, true, true);
        emit ArkBuilt(user1, beneficiary1, address(token1), expectedDeadline);

        vm.expectEmit(true, true, true, true);
        emit ArkBuilt(user1, beneficiary1, address(token2), expectedDeadline);

        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        (address beneficiary, uint256 deadline, uint256 duration) = noahV2.getArk(user1, address(token1));

        assertEq(beneficiary, beneficiary1);
        assertEq(deadline, expectedDeadline);
        assertEq(duration, DEADLINE_DURATION);

        (address beneficiary2, uint256 deadline2, uint256 duration2) = noahV2.getArk(user1, address(token2));

        assertEq(beneficiary2, beneficiary1);
        assertEq(deadline2, expectedDeadline);
        assertEq(duration2, DEADLINE_DURATION);

        vm.stopPrank();
    }

    function test_BuildArk_DifferentBeneficiariesForDifferentTokens() public {
        address[] memory tokens1 = new address[](1);
        tokens1[0] = address(token1);

        address[] memory tokens2 = new address[](1);
        tokens2[0] = address(token2);

        vm.startPrank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens1);
        noahV2.buildArk(beneficiary2, DEADLINE_DURATION * 2, tokens2);

        (address ben1,,) = noahV2.getArk(user1, address(token1));
        (address ben2, uint256 deadline2, uint256 duration2) = noahV2.getArk(user1, address(token2));

        assertEq(ben1, beneficiary1);
        assertEq(ben2, beneficiary2);
        assertEq(duration2, DEADLINE_DURATION * 2);

        vm.stopPrank();
    }

    function test_BuildArk_EmptyTokenList() public {
        address[] memory tokens = new address[](0);

        vm.prank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        // Should succeed even with empty token list
    }

    function test_BuildArk_RevertWhen_AlreadyInitializedForBeneficiary() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.expectRevert("Account already initialized");
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.stopPrank();
    }

    function test_BuildArk_RevertWhen_ZeroDuration() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        vm.expectRevert("Deadline duration must be greater than zero");
        noahV2.buildArk(beneficiary1, 0, tokens);
    }

    function test_BuildArk_MultipleUsers() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.prank(user2);
        noahV2.buildArk(beneficiary2, DEADLINE_DURATION * 2, tokens);

        (address ben1,,) = noahV2.getArk(user1, address(token1));
        (address ben2, uint256 deadline2, uint256 duration2) = noahV2.getArk(user2, address(token1));

        assertEq(ben1, beneficiary1);
        assertEq(ben2, beneficiary2);
        assertEq(duration2, DEADLINE_DURATION * 2);
    }

    // ===== destroyArk Tests =====

    function test_DestroyArk_Success() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.expectEmit(true, false, false, true);
        emit ArkDestroyed(user1, address(token1));

        noahV2.destroyArk(address(token1));

        (, uint256 deadline,) = noahV2.getArk(user1, address(token1));
        assertEq(deadline, 0);

        vm.stopPrank();
    }

    function test_DestroyArk_RevertWhen_ArkNotBuilt() public {
        vm.prank(user1);
        vm.expectRevert("Ark not built");
        noahV2.destroyArk(address(token1));
    }

    function test_DestroyArk_CanRebuildAfter() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);
        noahV2.destroyArk(address(token1));

        // Should be able to rebuild with same beneficiary
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION * 2, tokens);

        (,, uint256 duration) = noahV2.getArk(user1, address(token1));
        assertEq(duration, DEADLINE_DURATION * 2);

        vm.stopPrank();
    }

    // ===== pingArk Tests =====

    function test_PingArk_Success() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(token1);
        tokens[1] = address(token2);

        vm.startPrank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        // Fast forward time
        vm.warp(block.timestamp + 10 days);

        uint256 expectedNewDeadline = block.timestamp + DEADLINE_DURATION;

        address[] memory tokensToPin = new address[](2);
        tokensToPin[0] = address(token1);
        tokensToPin[1] = address(token2);

        vm.expectEmit(true, true, false, true);
        emit ArkPinged(user1, address(token1), expectedNewDeadline);

        vm.expectEmit(true, true, false, true);
        emit ArkPinged(user1, address(token2), expectedNewDeadline);

        noahV2.pingArk(tokensToPin);

        (, uint256 deadline1,) = noahV2.getArk(user1, address(token1));
        (, uint256 deadline2,) = noahV2.getArk(user1, address(token2));

        assertEq(deadline1, expectedNewDeadline);
        assertEq(deadline2, expectedNewDeadline);

        vm.stopPrank();
    }

    function test_PingArk_RevertWhen_NotInitialized() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        vm.expectRevert("Account not initialized");
        noahV2.pingArk(tokens);
    }

    function test_PingArk_SingleToken() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.warp(block.timestamp + 5 days);

        noahV2.pingArk(tokens);

        (, uint256 deadline,) = noahV2.getArk(user1, address(token1));
        assertEq(deadline, block.timestamp + DEADLINE_DURATION);

        vm.stopPrank();
    }

    function test_PingArk_EmptyArray() public {
        address[] memory tokens = new address[](0);

        vm.prank(user1);
        noahV2.pingArk(tokens);
        // Should succeed with no-op
    }

    // ===== flood Tests =====

    function test_Flood_Success() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(token1);
        tokens[1] = address(token2);

        vm.prank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        // Approve noah contract to transfer tokens
        vm.startPrank(user1);
        token1.approve(address(noahV2), type(uint256).max);
        token2.approve(address(noahV2), type(uint256).max);
        vm.stopPrank();

        // Fast forward past deadline
        vm.warp(block.timestamp + DEADLINE_DURATION + 1);

        address[] memory users = new address[](2);
        users[0] = user1;
        users[1] = user1;

        address[] memory tokensToFlood = new address[](2);
        tokensToFlood[0] = address(token1);
        tokensToFlood[1] = address(token2);

        uint256 beneficiaryBalanceBefore1 = token1.balanceOf(beneficiary1);
        uint256 beneficiaryBalanceBefore2 = token2.balanceOf(beneficiary1);

        noahV2.flood(users, tokensToFlood);

        assertEq(token1.balanceOf(beneficiary1), beneficiaryBalanceBefore1 + INITIAL_BALANCE);
        assertEq(token2.balanceOf(beneficiary1), beneficiaryBalanceBefore2 + INITIAL_BALANCE);
        assertEq(token1.balanceOf(user1), 0);
        assertEq(token2.balanceOf(user1), 0);
    }

    function test_Flood_MultipleUsers() public {
        address[] memory tokens1 = new address[](1);
        tokens1[0] = address(token1);

        vm.prank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens1);

        vm.prank(user2);
        noahV2.buildArk(beneficiary2, DEADLINE_DURATION, tokens1);

        vm.prank(user1);
        token1.approve(address(noahV2), type(uint256).max);

        vm.prank(user2);
        token1.approve(address(noahV2), type(uint256).max);

        vm.warp(block.timestamp + DEADLINE_DURATION + 1);

        address[] memory users = new address[](2);
        users[0] = user1;
        users[1] = user2;

        address[] memory tokensToFlood = new address[](2);
        tokensToFlood[0] = address(token1);
        tokensToFlood[1] = address(token1);

        noahV2.flood(users, tokensToFlood);

        assertEq(token1.balanceOf(beneficiary1), INITIAL_BALANCE);
        assertEq(token1.balanceOf(beneficiary2), INITIAL_BALANCE);
    }

    function test_Flood_ResetsDeadlineToZero() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.prank(user1);
        token1.approve(address(noahV2), type(uint256).max);

        vm.warp(block.timestamp + DEADLINE_DURATION + 1);

        address[] memory users = new address[](1);
        users[0] = user1;

        address[] memory tokensToFlood = new address[](1);
        tokensToFlood[0] = address(token1);

        noahV2.flood(users, tokensToFlood);

        (, uint256 deadline,) = noahV2.getArk(user1, address(token1));
        assertEq(deadline, 0);
    }

    function test_Flood_RevertWhen_NotInitialized() public {
        address[] memory users = new address[](1);
        users[0] = user1;

        address[] memory tokensToFlood = new address[](1);
        tokensToFlood[0] = address(token1);

        vm.expectRevert("Ark not initialized");
        noahV2.flood(users, tokensToFlood);
    }

    function test_Flood_RevertWhen_DeadlineNotPassed() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        address[] memory users = new address[](1);
        users[0] = user1;

        vm.expectRevert("Deadline has not passed");
        noahV2.flood(users, tokens);
    }

    function test_Flood_RevertWhen_ArrayLengthMismatch() public {
        address[] memory users = new address[](1);
        users[0] = user1;

        address[] memory tokensToFlood = new address[](2);
        tokensToFlood[0] = address(token1);
        tokensToFlood[1] = address(token2);

        vm.expectRevert("Users and tokens must have the same length");
        noahV2.flood(users, tokensToFlood);
    }

    function test_Flood_WithZeroBalance() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        // Transfer all tokens away
        vm.prank(user1);
        token1.transfer(user2, INITIAL_BALANCE);

        vm.warp(block.timestamp + DEADLINE_DURATION + 1);

        address[] memory users = new address[](1);
        users[0] = user1;

        noahV2.flood(users, tokens);

        // Should succeed but transfer 0 tokens
        assertEq(token1.balanceOf(beneficiary1), 0);
    }

    // ===== updateDeadlineDuration Tests =====

    function test_UpdateDeadlineDuration_Success() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        uint256 newDuration = 60 days;
        uint256 expectedDeadline = block.timestamp + newDuration;

        vm.expectEmit(true, false, false, true);
        emit DeadlineUpdated(user1, newDuration, expectedDeadline);

        noahV2.updateDeadlineDuration(address(token1), newDuration);

        (,uint256 deadline, uint256 duration) = noahV2.getArk(user1, address(token1));
        assertEq(duration, newDuration);
        assertEq(deadline, expectedDeadline);

        vm.stopPrank();
    }

    function test_UpdateDeadlineDuration_RevertWhen_ArkNotBuilt() public {
        vm.prank(user1);
        vm.expectRevert("Ark not built");
        noahV2.updateDeadlineDuration(address(token1), 60 days);
    }

    function test_UpdateDeadlineDuration_RevertWhen_ZeroDuration() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.expectRevert("Duration must be greater than zero");
        noahV2.updateDeadlineDuration(address(token1), 0);

        vm.stopPrank();
    }

    function test_UpdateDeadlineDuration_ResetsTimer() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        // Fast forward time
        vm.warp(block.timestamp + 20 days);

        uint256 newDuration = 10 days;
        noahV2.updateDeadlineDuration(address(token1), newDuration);

        (, uint256 deadline,) = noahV2.getArk(user1, address(token1));
        assertEq(deadline, block.timestamp + newDuration);

        vm.stopPrank();
    }

    // ===== Edge Cases and Integration Tests =====

    function test_CompleteUserJourney() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(token1);
        tokens[1] = address(token2);

        // Build ark
        vm.prank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        // Ping arks
        vm.warp(block.timestamp + 10 days);
        vm.prank(user1);
        noahV2.pingArk(tokens);

        // Update duration for one token
        vm.prank(user1);
        noahV2.updateDeadlineDuration(address(token1), 5 days);

        // Destroy ark for token2
        vm.prank(user1);
        noahV2.destroyArk(address(token2));

        // Wait and flood token1
        vm.warp(block.timestamp + 6 days);

        vm.prank(user1);
        token1.approve(address(noahV2), type(uint256).max);

        address[] memory users = new address[](1);
        users[0] = user1;

        address[] memory tokensToFlood = new address[](1);
        tokensToFlood[0] = address(token1);

        noahV2.flood(users, tokensToFlood);

        assertEq(token1.balanceOf(beneficiary1), INITIAL_BALANCE);
        assertEq(token2.balanceOf(beneficiary1), 0); // Ark was destroyed
    }

    function test_GetArk_UninitializedAccount() public view {
        (address beneficiary, uint256 deadline, uint256 duration) = noahV2.getArk(user1, address(token1));

        assertEq(beneficiary, address(0));
        assertEq(deadline, 0);
        assertEq(duration, 0);
    }

    function test_MultipleTokensSameBeneficiary() public {
        address[] memory tokens = new address[](3);
        tokens[0] = address(token1);
        tokens[1] = address(token2);
        tokens[2] = address(token3);

        vm.prank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        for (uint i = 0; i < tokens.length; i++) {
            (address ben,,) = noahV2.getArk(user1, tokens[i]);
            assertEq(ben, beneficiary1);
        }
    }

    // ===== Fuzz Tests =====

    function testFuzz_BuildArk(address _beneficiary, uint256 _duration) public {
        vm.assume(_beneficiary != address(0));
        vm.assume(_duration > 0 && _duration < 365 days * 10);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noahV2.buildArk(_beneficiary, _duration, tokens);

        (address beneficiary, uint256 deadline, uint256 duration) = noahV2.getArk(user1, address(token1));

        assertEq(beneficiary, _beneficiary);
        assertEq(duration, _duration);
        assertEq(deadline, block.timestamp + _duration);
    }

    function testFuzz_PingArk(uint256 _timeElapsed) public {
        vm.assume(_timeElapsed > 0 && _timeElapsed < DEADLINE_DURATION);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.warp(block.timestamp + _timeElapsed);

        vm.prank(user1);
        noahV2.pingArk(tokens);

        (, uint256 deadline,) = noahV2.getArk(user1, address(token1));
        assertEq(deadline, block.timestamp + DEADLINE_DURATION);
    }

    function testFuzz_UpdateDeadlineDuration(uint256 _newDuration) public {
        vm.assume(_newDuration > 0 && _newDuration < 365 days * 10);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noahV2.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.prank(user1);
        noahV2.updateDeadlineDuration(address(token1), _newDuration);

        (,, uint256 duration) = noahV2.getArk(user1, address(token1));
        assertEq(duration, _newDuration);
    }
}
