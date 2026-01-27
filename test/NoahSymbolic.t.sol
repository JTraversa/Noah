// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/noah.sol";
import "./mocks/MockERC20.sol";

/**
 * @title NoahSymbolicTest
 * @notice Formal verification tests for Noah contract using Halmos
 * @dev Run with: halmos --contract NoahSymbolicTest
 */
contract NoahSymbolicTest is Test {
    Noah public noah;
    address public user;
    address public beneficiary;

    function setUp() public {
        noah = new Noah();
        user = address(0x1000);
        beneficiary = address(0x2000);
    }

    /// @notice Helper to create an ark with N tokens for symbolic testing
    function _setupArkWithTokens(uint256 n) internal returns (address[] memory) {
        require(n > 0 && n <= 20, "Invalid token count");

        address[] memory tokens = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            tokens[i] = address(uint160(0x3000 + i));
        }

        vm.prank(user);
        noah.buildArk(beneficiary, 30 days, tokens);

        return tokens;
    }

    /// @notice Get tokens from ark
    function _getTokens() internal view returns (address[] memory) {
        (,,, address[] memory tokens) = noah.getArk(user);
        return tokens;
    }

    // ============================================================
    // FORMAL VERIFICATION PROPERTIES FOR removePassenger
    // ============================================================

    /**
     * @notice PROPERTY: removePassenger always decreases array length by exactly 1
     *         when the token exists in the array
     * @dev Proves: |tokens_after| = |tokens_before| - 1 (if token found)
     */
    function check_removePassenger_decreasesLengthByOne(uint8 tokenCount, uint8 removeIndex) public {
        // Bound inputs
        vm.assume(tokenCount >= 1 && tokenCount <= 15);
        vm.assume(removeIndex < tokenCount);

        address[] memory initialTokens = _setupArkWithTokens(tokenCount);
        address tokenToRemove = initialTokens[removeIndex];

        uint256 lengthBefore = _getTokens().length;

        vm.prank(user);
        noah.removePassenger(tokenToRemove);

        uint256 lengthAfter = _getTokens().length;

        // INVARIANT: Length decreases by exactly 1
        assert(lengthAfter == lengthBefore - 1);
    }

    /**
     * @notice PROPERTY: removePassenger removes exactly the specified token
     * @dev Proves: tokenToRemove ∉ tokens_after
     */
    function check_removePassenger_removesCorrectToken(uint8 tokenCount, uint8 removeIndex) public {
        vm.assume(tokenCount >= 1 && tokenCount <= 15);
        vm.assume(removeIndex < tokenCount);

        address[] memory initialTokens = _setupArkWithTokens(tokenCount);
        address tokenToRemove = initialTokens[removeIndex];

        vm.prank(user);
        noah.removePassenger(tokenToRemove);

        address[] memory remainingTokens = _getTokens();

        // INVARIANT: Removed token is not in the remaining array
        for (uint256 i = 0; i < remainingTokens.length; i++) {
            assert(remainingTokens[i] != tokenToRemove);
        }
    }

    /**
     * @notice PROPERTY: removePassenger preserves all other tokens
     * @dev Proves: ∀ t ∈ tokens_before, t ≠ tokenToRemove → t ∈ tokens_after
     */
    function check_removePassenger_preservesOtherTokens(uint8 tokenCount, uint8 removeIndex) public {
        vm.assume(tokenCount >= 2 && tokenCount <= 10);
        vm.assume(removeIndex < tokenCount);

        address[] memory initialTokens = _setupArkWithTokens(tokenCount);
        address tokenToRemove = initialTokens[removeIndex];

        vm.prank(user);
        noah.removePassenger(tokenToRemove);

        address[] memory remainingTokens = _getTokens();

        // INVARIANT: All tokens except the removed one are still present
        for (uint256 i = 0; i < initialTokens.length; i++) {
            if (initialTokens[i] != tokenToRemove) {
                bool found = false;
                for (uint256 j = 0; j < remainingTokens.length; j++) {
                    if (remainingTokens[j] == initialTokens[i]) {
                        found = true;
                        break;
                    }
                }
                assert(found);
            }
        }
    }

    /**
     * @notice PROPERTY: removePassenger with non-existent token doesn't change array
     * @dev Proves: token ∉ tokens_before → tokens_after = tokens_before
     */
    function check_removePassenger_noOpForNonExistent(uint8 tokenCount) public {
        vm.assume(tokenCount >= 1 && tokenCount <= 10);

        _setupArkWithTokens(tokenCount);

        // Use an address that's definitely not in the token list
        address nonExistentToken = address(0xDEAD);

        address[] memory tokensBefore = _getTokens();
        uint256 lengthBefore = tokensBefore.length;

        vm.prank(user);
        noah.removePassenger(nonExistentToken);

        address[] memory tokensAfter = _getTokens();

        // INVARIANT: Array unchanged when token not found
        assert(tokensAfter.length == lengthBefore);

        for (uint256 i = 0; i < lengthBefore; i++) {
            assert(tokensAfter[i] == tokensBefore[i]);
        }
    }

    // ============================================================
    // FORMAL VERIFICATION PROPERTIES FOR buildArk
    // ============================================================

    /**
     * @notice PROPERTY: buildArk correctly initializes all fields
     */
    function check_buildArk_initializesCorrectly(uint256 duration, uint8 tokenCount) public {
        vm.assume(duration > 0 && duration <= 365 days * 10);
        vm.assume(tokenCount <= 10);

        address[] memory tokens = new address[](tokenCount);
        for (uint256 i = 0; i < tokenCount; i++) {
            tokens[i] = address(uint160(0x3000 + i));
        }

        vm.prank(user);
        noah.buildArk(beneficiary, duration, tokens);

        (address storedBeneficiary, uint256 deadline, uint256 storedDuration, address[] memory storedTokens) = noah.getArk(user);

        // INVARIANTS
        assert(storedBeneficiary == beneficiary);
        assert(deadline == block.timestamp + duration);
        assert(storedDuration == duration);
        assert(storedTokens.length == tokenCount);
    }

    /**
     * @notice PROPERTY: Cannot build ark twice without destroying first
     */
    function check_buildArk_cannotBuildTwice(uint256 duration) public {
        vm.assume(duration > 0 && duration <= 365 days);

        address[] memory tokens = new address[](1);
        tokens[0] = address(0x3000);

        vm.startPrank(user);
        noah.buildArk(beneficiary, duration, tokens);

        // Second build should revert
        vm.expectRevert("Account already initialized");
        noah.buildArk(beneficiary, duration, tokens);
        vm.stopPrank();
    }

    // ============================================================
    // FORMAL VERIFICATION PROPERTIES FOR pingArk
    // ============================================================

    /**
     * @notice PROPERTY: pingArk correctly extends deadline
     */
    function check_pingArk_extendsDeadline(uint256 duration, uint256 timeElapsed) public {
        vm.assume(duration > 0 && duration <= 365 days);
        vm.assume(timeElapsed > 0 && timeElapsed < duration);

        address[] memory tokens = new address[](1);
        tokens[0] = address(0x3000);

        vm.prank(user);
        noah.buildArk(beneficiary, duration, tokens);

        // Advance time
        vm.warp(block.timestamp + timeElapsed);

        uint256 expectedNewDeadline = block.timestamp + duration;

        vm.prank(user);
        noah.pingArk();

        (, uint256 newDeadline,,) = noah.getArk(user);

        // INVARIANT: Deadline is reset to now + duration
        assert(newDeadline == expectedNewDeadline);
    }

    // ============================================================
    // FORMAL VERIFICATION PROPERTIES FOR addPassengers
    // ============================================================

    /**
     * @notice PROPERTY: addPassengers increases array length correctly
     */
    function check_addPassengers_increasesLength(uint8 initialCount, uint8 addCount) public {
        vm.assume(initialCount >= 1 && initialCount <= 10);
        vm.assume(addCount >= 1 && addCount <= 5);

        _setupArkWithTokens(initialCount);

        address[] memory newTokens = new address[](addCount);
        for (uint256 i = 0; i < addCount; i++) {
            newTokens[i] = address(uint160(0x5000 + i));
        }

        uint256 lengthBefore = _getTokens().length;

        vm.prank(user);
        noah.addPassengers(newTokens);

        uint256 lengthAfter = _getTokens().length;

        // INVARIANT: Length increases by addCount
        assert(lengthAfter == lengthBefore + addCount);
    }

    // ============================================================
    // FORMAL VERIFICATION PROPERTIES FOR destroyArk
    // ============================================================

    /**
     * @notice PROPERTY: destroyArk sets deadline to 0
     */
    function check_destroyArk_setsDeadlineToZero(uint256 duration) public {
        vm.assume(duration > 0 && duration <= 365 days);

        address[] memory tokens = new address[](1);
        tokens[0] = address(0x3000);

        vm.prank(user);
        noah.buildArk(beneficiary, duration, tokens);

        (, uint256 deadlineBefore,,) = noah.getArk(user);
        assert(deadlineBefore > 0);

        vm.prank(user);
        noah.destroyArk();

        (, uint256 deadlineAfter,,) = noah.getArk(user);

        // INVARIANT: Deadline is 0 after destroy
        assert(deadlineAfter == 0);
    }

    /**
     * @notice PROPERTY: Can rebuild ark after destroying
     */
    function check_destroyArk_allowsRebuild(uint256 duration1, uint256 duration2) public {
        vm.assume(duration1 > 0 && duration1 <= 365 days);
        vm.assume(duration2 > 0 && duration2 <= 365 days);

        address[] memory tokens = new address[](1);
        tokens[0] = address(0x3000);

        vm.startPrank(user);

        noah.buildArk(beneficiary, duration1, tokens);
        noah.destroyArk();

        // Should be able to rebuild
        noah.buildArk(beneficiary, duration2, tokens);

        vm.stopPrank();

        (, uint256 deadline, uint256 storedDuration,) = noah.getArk(user);

        // INVARIANT: New ark has new duration
        assert(storedDuration == duration2);
        assert(deadline == block.timestamp + duration2);
    }
}
