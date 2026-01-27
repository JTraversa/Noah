// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/noah.sol";
import "./mocks/MockERC20.sol";

/**
 * @title NoahTest
 * @notice Test suite for Noah contract with focus on removePassenger functionality
 */
contract NoahTest is Test {
    Noah public noah;

    address public user1;
    address public beneficiary1;

    uint256 constant DEADLINE_DURATION = 30 days;
    uint256 constant INITIAL_BALANCE = 1000 ether;

    // Dynamic array to hold mock tokens
    MockERC20[] public tokens;

    event PassengerRemoved(address indexed user, address passenger);
    event PassengersAdded(address indexed user, address[] newPassengers);

    function setUp() public {
        noah = new Noah();

        user1 = makeAddr("user1");
        beneficiary1 = makeAddr("beneficiary1");
    }

    // Helper to create N mock tokens
    function _createTokens(uint256 count) internal returns (address[] memory) {
        address[] memory tokenAddrs = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            MockERC20 token = new MockERC20(
                string(abi.encodePacked("Token", vm.toString(i))),
                string(abi.encodePacked("TK", vm.toString(i)))
            );
            token.mint(user1, INITIAL_BALANCE);
            tokens.push(token);
            tokenAddrs[i] = address(token);
        }
        return tokenAddrs;
    }

    // Helper to get current tokens from ark
    function _getArkTokens(address user) internal view returns (address[] memory) {
        (,,, address[] memory arkTokens) = noah.getArk(user);
        return arkTokens;
    }

    // ===== removePassenger Basic Tests =====

    function test_RemovePassenger_FromMiddleOf10() public {
        address[] memory tokenAddrs = _createTokens(10);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokenAddrs);

        // Remove the 5th token (index 4, middle of the list)
        address tokenToRemove = tokenAddrs[4];

        vm.expectEmit(true, false, false, true);
        emit PassengerRemoved(user1, tokenToRemove);

        noah.removePassenger(tokenToRemove);

        // Verify the token was removed
        address[] memory remainingTokens = _getArkTokens(user1);
        assertEq(remainingTokens.length, 9, "Should have 9 tokens after removal");

        // Verify the removed token is not in the list
        for (uint256 i = 0; i < remainingTokens.length; i++) {
            assertTrue(remainingTokens[i] != tokenToRemove, "Removed token should not be in list");
        }

        // Verify swap-and-pop behavior: last element should now be at index 4
        assertEq(remainingTokens[4], tokenAddrs[9], "Last token should be swapped to removed position");

        vm.stopPrank();
    }

    function test_RemovePassenger_FirstElement() public {
        address[] memory tokenAddrs = _createTokens(10);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokenAddrs);

        address tokenToRemove = tokenAddrs[0];
        noah.removePassenger(tokenToRemove);

        address[] memory remainingTokens = _getArkTokens(user1);
        assertEq(remainingTokens.length, 9);

        // First element should now be the last element from original array
        assertEq(remainingTokens[0], tokenAddrs[9]);

        vm.stopPrank();
    }

    function test_RemovePassenger_LastElement() public {
        address[] memory tokenAddrs = _createTokens(10);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokenAddrs);

        address tokenToRemove = tokenAddrs[9];
        noah.removePassenger(tokenToRemove);

        address[] memory remainingTokens = _getArkTokens(user1);
        assertEq(remainingTokens.length, 9);

        // All other elements should remain in original order
        for (uint256 i = 0; i < 9; i++) {
            assertEq(remainingTokens[i], tokenAddrs[i]);
        }

        vm.stopPrank();
    }

    function test_RemovePassenger_AllTokensOneByOne() public {
        address[] memory tokenAddrs = _createTokens(5);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokenAddrs);

        // Remove all tokens one by one
        for (uint256 i = 0; i < 5; i++) {
            address[] memory currentTokens = _getArkTokens(user1);
            if (currentTokens.length > 0) {
                noah.removePassenger(currentTokens[0]);
            }
        }

        address[] memory remainingTokens = _getArkTokens(user1);
        assertEq(remainingTokens.length, 0, "All tokens should be removed");

        vm.stopPrank();
    }

    function test_RemovePassenger_VerifyOrderAfterMultipleRemovals() public {
        address[] memory tokenAddrs = _createTokens(10);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokenAddrs);

        // Remove tokens at indices 2, 5, 7 (in that order)
        // After removing index 2: [0,1,9,3,4,5,6,7,8] (9 swapped to position 2)
        noah.removePassenger(tokenAddrs[2]);

        // After removing original index 5: [0,1,9,3,4,8,6,7] (8 swapped to position 5)
        noah.removePassenger(tokenAddrs[5]);

        // After removing original index 7: [0,1,9,3,4,8,6] (7 was at end after previous swap, now removed)
        noah.removePassenger(tokenAddrs[7]);

        address[] memory remainingTokens = _getArkTokens(user1);
        assertEq(remainingTokens.length, 7, "Should have 7 tokens");

        // Verify removed tokens are not present
        for (uint256 i = 0; i < remainingTokens.length; i++) {
            assertTrue(remainingTokens[i] != tokenAddrs[2], "Token 2 should be removed");
            assertTrue(remainingTokens[i] != tokenAddrs[5], "Token 5 should be removed");
            assertTrue(remainingTokens[i] != tokenAddrs[7], "Token 7 should be removed");
        }

        vm.stopPrank();
    }

    function test_RemovePassenger_NonExistentToken() public {
        address[] memory tokenAddrs = _createTokens(5);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokenAddrs);

        // Try to remove a token that doesn't exist in the ark
        address nonExistentToken = makeAddr("nonExistent");

        // Should still emit event but not change the array
        noah.removePassenger(nonExistentToken);

        address[] memory remainingTokens = _getArkTokens(user1);
        assertEq(remainingTokens.length, 5, "Array length should be unchanged");

        vm.stopPrank();
    }

    // ===== Gas Comparison Tests =====

    function test_Gas_RemoveMiddleToken_5Tokens() public {
        address[] memory tokenAddrs = _createTokens(5);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokenAddrs);

        // Remove middle token (index 2)
        address tokenToRemove = tokenAddrs[2];

        uint256 gasBefore = gasleft();
        noah.removePassenger(tokenToRemove);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas used to remove middle token from 5 tokens:", gasUsed);

        vm.stopPrank();
    }

    function test_Gas_RemoveMiddleToken_10Tokens() public {
        address[] memory tokenAddrs = _createTokens(10);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokenAddrs);

        // Remove middle token (index 5)
        address tokenToRemove = tokenAddrs[5];

        uint256 gasBefore = gasleft();
        noah.removePassenger(tokenToRemove);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas used to remove middle token from 10 tokens:", gasUsed);

        vm.stopPrank();
    }

    function test_Gas_RemoveMiddleToken_15Tokens() public {
        address[] memory tokenAddrs = _createTokens(15);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokenAddrs);

        // Remove middle token (index 7)
        address tokenToRemove = tokenAddrs[7];

        uint256 gasBefore = gasleft();
        noah.removePassenger(tokenToRemove);
        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas used to remove middle token from 15 tokens:", gasUsed);

        vm.stopPrank();
    }

    function test_Gas_Summary() public {
        console.log("\n========================================");
        console.log("=== REMOVE PASSENGER GAS COMPARISON ===");
        console.log("========================================\n");

        console.log("Testing removal of MIDDLE token:\n");

        // 5 tokens
        {
            delete tokens;
            Noah n = new Noah();
            address[] memory addrs = _createTokens(5);
            vm.prank(user1);
            n.buildArk(beneficiary1, DEADLINE_DURATION, addrs);

            vm.prank(user1);
            uint256 g1 = gasleft();
            n.removePassenger(addrs[2]); // middle
            uint256 gas5 = g1 - gasleft();
            console.log("  5 tokens - middle removal:", gas5, "gas");
        }

        // 10 tokens
        {
            delete tokens;
            Noah n = new Noah();
            address[] memory addrs = _createTokens(10);
            vm.prank(user1);
            n.buildArk(beneficiary1, DEADLINE_DURATION, addrs);

            vm.prank(user1);
            uint256 g1 = gasleft();
            n.removePassenger(addrs[5]); // middle
            uint256 gas10 = g1 - gasleft();
            console.log(" 10 tokens - middle removal:", gas10, "gas");
        }

        // 15 tokens
        {
            delete tokens;
            Noah n = new Noah();
            address[] memory addrs = _createTokens(15);
            vm.prank(user1);
            n.buildArk(beneficiary1, DEADLINE_DURATION, addrs);

            vm.prank(user1);
            uint256 g1 = gasleft();
            n.removePassenger(addrs[7]); // middle
            uint256 gas15 = g1 - gasleft();
            console.log(" 15 tokens - middle removal:", gas15, "gas");
        }

        console.log("\n----------------------------------------");
        console.log("Note: Gas increases ~linearly with array");
        console.log("size due to the loop search. Swap-and-pop");
        console.log("keeps removal O(n) search + O(1) removal.");
        console.log("----------------------------------------\n");
    }

    // ===== Additional Edge Case Tests =====

    function test_RemovePassenger_RevertWhen_ArkNotBuilt() public {
        vm.prank(user1);
        vm.expectRevert("Ark not built");
        noah.removePassenger(address(0x1234));
    }

    function test_RemovePassenger_SingleTokenArk() public {
        address[] memory tokenAddrs = _createTokens(1);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokenAddrs);

        noah.removePassenger(tokenAddrs[0]);

        address[] memory remainingTokens = _getArkTokens(user1);
        assertEq(remainingTokens.length, 0);

        vm.stopPrank();
    }

    function test_RemovePassenger_ThenFlood() public {
        address[] memory tokenAddrs = _createTokens(5);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokenAddrs);

        // Approve tokens for flood
        for (uint256 i = 0; i < tokenAddrs.length; i++) {
            MockERC20(tokenAddrs[i]).approve(address(noah), type(uint256).max);
        }

        // Remove middle token
        noah.removePassenger(tokenAddrs[2]);
        vm.stopPrank();

        // Warp past deadline
        vm.warp(block.timestamp + DEADLINE_DURATION + 1);

        // Flood should only transfer remaining 4 tokens
        noah.flood(user1);

        // Verify balances
        assertEq(MockERC20(tokenAddrs[0]).balanceOf(beneficiary1), INITIAL_BALANCE);
        assertEq(MockERC20(tokenAddrs[1]).balanceOf(beneficiary1), INITIAL_BALANCE);
        assertEq(MockERC20(tokenAddrs[2]).balanceOf(beneficiary1), 0); // Was removed
        assertEq(MockERC20(tokenAddrs[3]).balanceOf(beneficiary1), INITIAL_BALANCE);
        assertEq(MockERC20(tokenAddrs[4]).balanceOf(beneficiary1), INITIAL_BALANCE);
    }

    function testFuzz_RemovePassenger_AnyPosition(uint8 tokenCount, uint8 removeIndex) public {
        // Bound inputs to reasonable values
        tokenCount = uint8(bound(tokenCount, 1, 20));
        removeIndex = uint8(bound(removeIndex, 0, tokenCount - 1));

        address[] memory tokenAddrs = _createTokens(tokenCount);

        vm.startPrank(user1);
        noah.buildArk(beneficiary1, DEADLINE_DURATION, tokenAddrs);

        address tokenToRemove = tokenAddrs[removeIndex];
        noah.removePassenger(tokenToRemove);

        address[] memory remainingTokens = _getArkTokens(user1);
        assertEq(remainingTokens.length, tokenCount - 1);

        // Verify removed token is not present
        for (uint256 i = 0; i < remainingTokens.length; i++) {
            assertTrue(remainingTokens[i] != tokenToRemove);
        }

        vm.stopPrank();
    }
}
