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

    /// @notice Helper to create an ark with a fixed number of tokens
    /// @dev Uses concrete sizes to avoid Halmos symbolic CALLDATACOPY issues
    function _setupArkWith3Tokens() internal returns (address[] memory) {
        address[] memory tokens = new address[](3);
        tokens[0] = address(0x3000);
        tokens[1] = address(0x3001);
        tokens[2] = address(0x3002);

        vm.prank(user);
        noah.buildArk(beneficiary, 30 days, tokens);

        return tokens;
    }

    function _setupArkWith5Tokens() internal returns (address[] memory) {
        address[] memory tokens = new address[](5);
        tokens[0] = address(0x3000);
        tokens[1] = address(0x3001);
        tokens[2] = address(0x3002);
        tokens[3] = address(0x3003);
        tokens[4] = address(0x3004);

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
     *      Tests removal of first token from a 3-token array
     */
    function check_removePassenger_decreasesLengthByOne_first() public {
        address[] memory initialTokens = _setupArkWith3Tokens();
        address tokenToRemove = initialTokens[0];

        uint256 lengthBefore = _getTokens().length;

        vm.prank(user);
        noah.removePassenger(tokenToRemove);

        uint256 lengthAfter = _getTokens().length;

        // INVARIANT: Length decreases by exactly 1
        assert(lengthAfter == lengthBefore - 1);
    }

    /**
     * @notice PROPERTY: removePassenger decreases length - middle element
     */
    function check_removePassenger_decreasesLengthByOne_middle() public {
        address[] memory initialTokens = _setupArkWith3Tokens();
        address tokenToRemove = initialTokens[1];

        uint256 lengthBefore = _getTokens().length;

        vm.prank(user);
        noah.removePassenger(tokenToRemove);

        uint256 lengthAfter = _getTokens().length;

        assert(lengthAfter == lengthBefore - 1);
    }

    /**
     * @notice PROPERTY: removePassenger decreases length - last element
     */
    function check_removePassenger_decreasesLengthByOne_last() public {
        address[] memory initialTokens = _setupArkWith3Tokens();
        address tokenToRemove = initialTokens[2];

        uint256 lengthBefore = _getTokens().length;

        vm.prank(user);
        noah.removePassenger(tokenToRemove);

        uint256 lengthAfter = _getTokens().length;

        assert(lengthAfter == lengthBefore - 1);
    }

    /**
     * @notice PROPERTY: removePassenger removes exactly the specified token
     * @dev Proves: tokenToRemove ∉ tokens_after
     */
    function check_removePassenger_removesCorrectToken() public {
        address[] memory initialTokens = _setupArkWith3Tokens();
        address tokenToRemove = initialTokens[1]; // Remove middle token

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
    function check_removePassenger_preservesOtherTokens() public {
        address[] memory initialTokens = _setupArkWith3Tokens();
        address tokenToRemove = initialTokens[1]; // Remove middle token

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
    function check_removePassenger_noOpForNonExistent() public {
        _setupArkWith3Tokens();

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
    function check_buildArk_initializesCorrectly(uint256 duration) public {
        vm.assume(duration > 0 && duration <= 365 days * 10);

        address[] memory tokens = new address[](3);
        tokens[0] = address(0x3000);
        tokens[1] = address(0x3001);
        tokens[2] = address(0x3002);

        vm.prank(user);
        noah.buildArk(beneficiary, duration, tokens);

        (address storedBeneficiary, uint256 deadline, uint256 storedDuration, address[] memory storedTokens) = noah.getArk(user);

        // INVARIANTS
        assert(storedBeneficiary == beneficiary);
        assert(deadline == block.timestamp + duration);
        assert(storedDuration == duration);
        assert(storedTokens.length == 3);
    }

    /**
     * @notice PROPERTY: buildArk sets non-zero deadline (ark is active)
     * @dev Tests that after building, the ark has an active deadline
     */
    function check_buildArk_setsActiveDeadline(uint256 duration) public {
        vm.assume(duration > 0 && duration <= 365 days);

        address[] memory tokens = new address[](1);
        tokens[0] = address(0x3000);

        // Verify deadline is 0 before building
        (, uint256 deadlineBefore,,) = noah.getArk(user);
        assert(deadlineBefore == 0);

        vm.prank(user);
        noah.buildArk(beneficiary, duration, tokens);

        // Verify deadline is non-zero after building
        (, uint256 deadlineAfter,,) = noah.getArk(user);
        assert(deadlineAfter > 0);
        assert(deadlineAfter == block.timestamp + duration);
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
    function check_addPassengers_increasesLength() public {
        _setupArkWith3Tokens();

        address[] memory newTokens = new address[](2);
        newTokens[0] = address(0x5000);
        newTokens[1] = address(0x5001);

        uint256 lengthBefore = _getTokens().length;

        vm.prank(user);
        noah.addPassengers(newTokens);

        uint256 lengthAfter = _getTokens().length;

        // INVARIANT: Length increases by 2
        assert(lengthAfter == lengthBefore + 2);
    }

    /**
     * @notice PROPERTY: addPassengers preserves existing tokens
     */
    function check_addPassengers_preservesExisting() public {
        address[] memory initialTokens = _setupArkWith3Tokens();

        address[] memory newTokens = new address[](2);
        newTokens[0] = address(0x5000);
        newTokens[1] = address(0x5001);

        vm.prank(user);
        noah.addPassengers(newTokens);

        address[] memory allTokens = _getTokens();

        // INVARIANT: Original tokens are still present
        for (uint256 i = 0; i < initialTokens.length; i++) {
            bool found = false;
            for (uint256 j = 0; j < allTokens.length; j++) {
                if (allTokens[j] == initialTokens[i]) {
                    found = true;
                    break;
                }
            }
            assert(found);
        }
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
