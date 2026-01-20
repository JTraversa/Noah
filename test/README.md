# Noah Contract Testing Suite

This directory contains comprehensive tests for both Noah v1 and v2 contracts using the Foundry testing framework.

## Test Files

- **Noah.t.sol** - Tests for the original Noah contract (noah.sol)
- **NoahV2.t.sol** - Tests for Noah v2 contract (noahv2.sol)
- **mocks/MockERC20.sol** - Mock ERC20 token implementation for testing

## Test Coverage

### Noah v1 Tests (Noah.t.sol)

Tests for noah.sol covering:

- **buildArk**: Building arks with beneficiaries and tokens
  - Success cases with single/multiple tokens
  - Empty token list handling
  - Revert on already initialized
  - Revert on zero address beneficiary
  - Revert on zero duration
  - Multiple users building arks

- **pingArk**: Resetting ark timers
  - Success cases with single/multiple pings
  - Revert when not initialized
  - Multiple ping operations

- **flood**: Triggering token transfers to beneficiaries
  - Success cases with single/multiple tokens
  - Deadline reset after flood
  - Revert when not initialized
  - Revert when deadline not passed
  - Zero balance handling
  - Re-initialization after flood

- **addPassengers**: Adding tokens to existing arks
  - Success cases
  - Empty array handling
  - Revert when ark not built

- **removePassenger**: Removing tokens from arks
  - Success cases
  - Non-existent token handling
  - Revert when ark not built

- **updateDeadlineDuration**: Modifying ark durations
  - Success cases
  - Timer reset behavior
  - Revert when ark not built
  - Revert on zero duration

- **Edge Cases**: Complete user journey, uninitialized accounts
- **Fuzz Tests**: Property-based testing for buildArk, pingArk, and updateDeadlineDuration

### Noah v2 Tests (NoahV2.t.sol)

Tests for noahv2.sol covering:

- **buildArk**: Per-token ark creation
  - Success cases with multiple tokens
  - Different beneficiaries per token
  - Empty token list handling
  - Revert on already initialized for beneficiary
  - Revert on zero duration

- **destroyArk**: Removing specific token arks
  - Success cases
  - Revert when ark not built
  - Re-building after destroy

- **pingArk**: Batch ark timer resets
  - Success cases with single/multiple tokens
  - Empty array handling
  - Revert when not initialized

- **flood**: Batch token recovery
  - Success cases with single/multiple users and tokens
  - Multiple users in single flood
  - Deadline reset behavior
  - Revert when not initialized
  - Revert when deadline not passed
  - Revert on array length mismatch
  - Zero balance handling

- **updateDeadlineDuration**: Per-token duration updates
  - Success cases
  - Timer reset behavior
  - Revert when ark not built
  - Revert on zero duration

- **Edge Cases**: Complete user journey, multiple tokens same beneficiary
- **Fuzz Tests**: Property-based testing for buildArk, pingArk, and updateDeadlineDuration

## Running Tests

### Install Foundry

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Install Dependencies

```bash
forge install foundry-rs/forge-std --no-commit
```

### Run All Tests

```bash
forge test
```

### Run Specific Test File

```bash
# Test Noah v1
forge test --match-path test/Noah.t.sol

# Test Noah v2
forge test --match-path test/NoahV2.t.sol
```

### Run Specific Test Function

```bash
forge test --match-test test_BuildArk_Success
```

### Run Tests with Verbosity

```bash
# Show test execution details
forge test -vv

# Show test execution with stack traces
forge test -vvv

# Show detailed traces including state changes
forge test -vvvv
```

### Generate Coverage Report

```bash
forge coverage
```

### Generate Gas Report

```bash
forge test --gas-report
```

## Test Structure

Each test file follows this structure:

1. **Setup**: Initializes contracts, tokens, and test addresses
2. **Test Categories**: Organized by function being tested
3. **Test Naming**: `test_Function_Scenario` or `test_Function_RevertWhen_Condition`
4. **Fuzz Tests**: Property-based tests with `testFuzz_` prefix

## Key Testing Patterns

- **Event Testing**: Uses `vm.expectEmit()` to verify event emissions
- **Time Manipulation**: Uses `vm.warp()` to simulate time passage
- **User Impersonation**: Uses `vm.prank()` and `vm.startPrank()` for different callers
- **Revert Testing**: Uses `vm.expectRevert()` to test error conditions
- **Fuzz Testing**: Uses Foundry's fuzzing capabilities for property testing

## Mock Contracts

### MockERC20

A complete ERC20 implementation with additional test helpers:
- `mint(address, uint256)`: Mint tokens to any address
- `burn(address, uint256)`: Burn tokens from any address

## Notes

- All tests use the Foundry testing framework and forge-std library
- Tests are isolated and can run in any order
- Mock contracts are in the `mocks/` subdirectory
- Tests cover both happy paths and error conditions
- Fuzz tests help discover edge cases automatically
