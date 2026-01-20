// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/noah.sol";
import "./mocks/MockERC20.sol";

/**
 * @title NoahTest
 * @notice Comprehensive test suite for Noah contract (v1)
 */
contract NoahTest is Test {
    Noah public noah;
    MockERC20 public token1;
    MockERC20 public token2;
    MockERC20 public token3;

    address public user1;
    address public user2;
    address public beneficiary1;
    address public beneficiary2;

    uint256 constant DEADLINE_DURATION = 30 days;
    uint256 constant INITIAL_BALANCE = 1000 ether;

    event ArkBuilt(address indexed user, address indexed beneficiary, uint256 deadline);
    event ArkPinged(address indexed user, uint256 newDeadline);
    event FloodTriggered(address indexed user, address indexed beneficiary, uint256 usdcAmount);
    event PassengersAdded(address indexed user, address[] newPassengers);
    event PassengerRemoved(address indexed user, address passenger);
    event DeadlineUpdated(address indexed user, uint256 newDuration, uint256 newDeadline);

    function setUp() public {
        noah = new Noah();

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

        vm.expectEmit(true, true, false, true);
        emit ArkBuilt(user1, beneficiary1, expectedDeadline);

        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        (address beneficiary, uint256 deadline, uint256 duration) = noah.getArk(user1, address(token1));

        assertEq(beneficiary, beneficiary1);
        assertEq(deadline, expectedDeadline);
        assertEq(duration, DEADLINE_DURATION);

        vm.stopPrank();
    }

    function test_BuildArk_EmptyTokenList() public {
        address[] memory tokens = new address[](0);

        vm.prank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        // Should succeed even with empty token list
    }

    function test_BuildArk_RevertWhen_AlreadyInitialized() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.expectRevert("Account already initialized");
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.stopPrank();
    }

    function test_BuildArk_RevertWhen_ZeroAddressBeneficiary() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        vm.expectRevert("Beneficiary cannot be the zero address");
        noah.buildArk(address(0), DEADLINE_DURATION, tokens);
    }

    function test_BuildArk_RevertWhen_ZeroDuration() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        vm.expectRevert("Deadline duration must be greater than zero");
        noah.buildArk(beneficiary1, 0, tokens);
    }

    function test_BuildArk_MultipleUsers() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.prank(user2);
        noah.buildArk(beneficiary2, DEADLINE_DURATION * 2, tokens);

        (address ben1,,) = noah.getArk(user1, address(token1));
        (address ben2, uint256 deadline2, uint256 duration2) = noah.getArk(user2, address(token1));

        assertEq(ben1, beneficiary1);
        assertEq(ben2, beneficiary2);
        assertEq(duration2, DEADLINE_DURATION * 2);
    }

    // ===== pingArk Tests =====

    function test_PingArk_Success() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        // Fast forward time
        vm.warp(block.timestamp + 10 days);

        uint256 expectedNewDeadline = block.timestamp + DEADLINE_DURATION;

        vm.expectEmit(true, false, false, true);
        emit ArkPinged(user1, expectedNewDeadline);

        noah.pingArk();

        (, uint256 deadline,) = noah.getArk(user1, address(token1));
        assertEq(deadline, expectedNewDeadline);

        vm.stopPrank();
    }

    function test_PingArk_RevertWhen_NotInitialized() public {
        vm.prank(user1);
        vm.expectRevert("Account not initialized");
        noah.pingArk();
    }

    function test_PingArk_MultipleTimes() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        for (uint i = 0; i < 5; i++) {
            vm.warp(block.timestamp + 5 days);
            noah.pingArk();
        }

        (, uint256 deadline,) = noah.getArk(user1, address(token1));
        assertEq(deadline, block.timestamp + DEADLINE_DURATION);

        vm.stopPrank();
    }

    // ===== flood Tests =====

    function test_Flood_Success() public {
        address[] memory tokens = new address[](2);
        tokens[0] = address(token1);
        tokens[1] = address(token2);

        vm.prank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        // Approve noah contract to transfer tokens
        vm.startPrank(user1);
        token1.approve(address(noah), type(uint256).max);
        token2.approve(address(noah), type(uint256).max);
        vm.stopPrank();

        // Fast forward past deadline
        vm.warp(block.timestamp + DEADLINE_DURATION + 1);

        uint256 beneficiaryBalanceBefore1 = token1.balanceOf(beneficiary1);
        uint256 beneficiaryBalanceBefore2 = token2.balanceOf(beneficiary1);

        noah.flood(user1);

        assertEq(token1.balanceOf(beneficiary1), beneficiaryBalanceBefore1 + INITIAL_BALANCE);
        assertEq(token2.balanceOf(beneficiary1), beneficiaryBalanceBefore2 + INITIAL_BALANCE);
        assertEq(token1.balanceOf(user1), 0);
        assertEq(token2.balanceOf(user1), 0);
    }

    function test_Flood_ResetsDeadline() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.prank(user1);
        token1.approve(address(noah), type(uint256).max);

        vm.warp(block.timestamp + DEADLINE_DURATION + 1);
        noah.flood(user1);

        (, uint256 deadline,) = noah.getArk(user1, address(token1));
        assertEq(deadline, 0);
    }

    function test_Flood_RevertWhen_NotInitialized() public {
        vm.expectRevert("Account not initialized");
        noah.flood(user1);
    }

    function test_Flood_RevertWhen_DeadlineNotPassed() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.expectRevert("Deadline has not passed");
        noah.flood(user1);
    }

    function test_Flood_WithZeroBalance() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        // Transfer all tokens away
        vm.prank(user1);
        token1.transfer(user2, INITIAL_BALANCE);

        vm.warp(block.timestamp + DEADLINE_DURATION + 1);
        noah.flood(user1);

        // Should succeed but transfer 0 tokens
        assertEq(token1.balanceOf(beneficiary1), 0);
    }

    function test_Flood_CanRebuildAfterFlood() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.prank(user1);
        token1.approve(address(noah), type(uint256).max);

        vm.warp(block.timestamp + DEADLINE_DURATION + 1);
        noah.flood(user1);

        // Should be able to build ark again
        vm.prank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        (, uint256 deadline,) = noah.getArk(user1, address(token1));
        assertGt(deadline, 0);
    }

    // ===== addPassengers Tests =====

    function test_AddPassengers_Success() public {
        address[] memory initialTokens = new address[](1);
        initialTokens[0] = address(token1);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, initialTokens);

        address[] memory newPassengers = new address[](2);
        newPassengers[0] = address(token2);
        newPassengers[1] = address(token3);

        vm.expectEmit(true, false, false, true);
        emit PassengersAdded(user1, newPassengers);

        noah.addPassengers(newPassengers);
        vm.stopPrank();
    }

    function test_AddPassengers_RevertWhen_ArkNotBuilt() public {
        address[] memory newPassengers = new address[](1);
        newPassengers[0] = address(token2);

        vm.prank(user1);
        vm.expectRevert("Ark not built");
        noah.addPassengers(newPassengers);
    }

    function test_AddPassengers_EmptyArray() public {
        address[] memory initialTokens = new address[](1);
        initialTokens[0] = address(token1);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, initialTokens);

        address[] memory newPassengers = new address[](0);
        noah.addPassengers(newPassengers);
        vm.stopPrank();
    }

    // ===== removePassenger Tests =====

    function test_RemovePassenger_Success() public {
        address[] memory tokens = new address[](3);
        tokens[0] = address(token1);
        tokens[1] = address(token2);
        tokens[2] = address(token3);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.expectEmit(true, false, false, true);
        emit PassengerRemoved(user1, address(token2));

        noah.removePassenger(address(token2));
        vm.stopPrank();
    }

    function test_RemovePassenger_RevertWhen_ArkNotBuilt() public {
        vm.prank(user1);
        vm.expectRevert("Ark not built");
        noah.removePassenger(address(token1));
    }

    function test_RemovePassenger_NonExistentToken() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        // Should not revert, just does nothing
        noah.removePassenger(address(token2));
        vm.stopPrank();
    }

    // ===== updateDeadlineDuration Tests =====

    function test_UpdateDeadlineDuration_Success() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        uint256 newDuration = 60 days;
        uint256 expectedDeadline = block.timestamp + newDuration;

        vm.expectEmit(true, false, false, true);
        emit DeadlineUpdated(user1, newDuration, expectedDeadline);

        noah.updateDeadlineDuration(newDuration);

        (,uint256 deadline, uint256 duration) = noah.getArk(user1, address(token1));
        assertEq(duration, newDuration);
        assertEq(deadline, expectedDeadline);

        vm.stopPrank();
    }

    function test_UpdateDeadlineDuration_RevertWhen_ArkNotBuilt() public {
        vm.prank(user1);
        vm.expectRevert("Ark not built");
        noah.updateDeadlineDuration(60 days);
    }

    function test_UpdateDeadlineDuration_RevertWhen_ZeroDuration() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.expectRevert("Duration must be greater than zero");
        noah.updateDeadlineDuration(0);

        vm.stopPrank();
    }

    function test_UpdateDeadlineDuration_ResetsTimer() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        // Fast forward time
        vm.warp(block.timestamp + 20 days);

        uint256 newDuration = 10 days;
        noah.updateDeadlineDuration(newDuration);

        (, uint256 deadline,) = noah.getArk(user1, address(token1));
        assertEq(deadline, block.timestamp + newDuration);

        vm.stopPrank();
    }

    // ===== Edge Cases and Integration Tests =====

    function test_CompleteUserJourney() public {
        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        // Build ark
        vm.prank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        // Add more passengers
        address[] memory newPassengers = new address[](1);
        newPassengers[0] = address(token2);
        vm.prank(user1);
        noah.addPassengers(newPassengers);

        // Ping ark multiple times
        vm.warp(block.timestamp + 10 days);
        vm.prank(user1);
        noah.pingArk();

        vm.warp(block.timestamp + 10 days);
        vm.prank(user1);
        noah.pingArk();

        // Update duration
        vm.prank(user1);
        noah.updateDeadlineDuration(5 days);

        // Remove a passenger
        vm.prank(user1);
        noah.removePassenger(address(token1));

        // Wait and flood
        vm.warp(block.timestamp + 6 days);

        vm.startPrank(user1);
        token2.approve(address(noah), type(uint256).max);
        vm.stopPrank();

        noah.flood(user1);

        assertEq(token2.balanceOf(beneficiary1), INITIAL_BALANCE);
    }

    function test_GetArk_UninitializedAccount() public view {
        (address beneficiary, uint256 deadline, uint256 duration) = noah.getArk(user1, address(token1));

        assertEq(beneficiary, address(0));
        assertEq(deadline, 0);
        assertEq(duration, 0);
    }

    // ===== Fuzz Tests =====

    function testFuzz_BuildArk(address _beneficiary, uint256 _duration) public {
        vm.assume(_beneficiary != address(0));
        vm.assume(_duration > 0 && _duration < 365 days * 10);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noah.buildArk(_beneficiary, _duration, tokens);

        (address beneficiary, uint256 deadline, uint256 duration) = noah.getArk(user1, address(token1));

        assertEq(beneficiary, _beneficiary);
        assertEq(duration, _duration);
        assertEq(deadline, block.timestamp + _duration);
    }

    function testFuzz_PingArk(uint256 _timeElapsed) public {
        vm.assume(_timeElapsed > 0 && _timeElapsed < DEADLINE_DURATION);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.warp(block.timestamp + _timeElapsed);

        vm.prank(user1);
        noah.pingArk();

        (, uint256 deadline,) = noah.getArk(user1, address(token1));
        assertEq(deadline, block.timestamp + DEADLINE_DURATION);
    }

    function testFuzz_UpdateDeadlineDuration(uint256 _newDuration) public {
        vm.assume(_newDuration > 0 && _newDuration < 365 days * 10);

        address[] memory tokens = new address[](1);
        tokens[0] = address(token1);

        vm.prank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokens);

        vm.prank(user1);
        noah.updateDeadlineDuration(_newDuration);

        (,, uint256 duration) = noah.getArk(user1, address(token1));
        assertEq(duration, _newDuration);
    }
}
