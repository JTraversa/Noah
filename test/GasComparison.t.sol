// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import {Noah as NoahV1} from "../contracts/noah.sol";
import {Noah as NoahV2} from "../contracts/noahv2.sol";
import "./mocks/MockERC20.sol";

/**
 * @title GasComparisonTest
 * @notice Compares gas costs between Noah V1 and V2 for 5 tokens
 * @dev Run with `forge test --match-contract GasComparisonTest -vvv` to see gas reports
 */
contract GasComparisonTest is Test {
    NoahV1 public noahV1;
    NoahV2 public noahV2;

    MockERC20 public token1;
    MockERC20 public token2;
    MockERC20 public token3;
    MockERC20 public token4;
    MockERC20 public token5;

    address public user;
    address public beneficiary;

    uint256 constant DEADLINE_DURATION = 30 days;

    function setUp() public {
        noahV1 = new NoahV1();
        noahV2 = new NoahV2();

        token1 = new MockERC20("Token1", "TK1");
        token2 = new MockERC20("Token2", "TK2");
        token3 = new MockERC20("Token3", "TK3");
        token4 = new MockERC20("Token4", "TK4");
        token5 = new MockERC20("Token5", "TK5");

        user = makeAddr("user");
        beneficiary = makeAddr("beneficiary");
    }

    // ===== Build Ark Gas Comparison =====

    function test_GasComparison_BuildArk_V1_5Tokens() public {
        address[] memory tokens = new address[](5);
        tokens[0] = address(token1);
        tokens[1] = address(token2);
        tokens[2] = address(token3);
        tokens[3] = address(token4);
        tokens[4] = address(token5);

        vm.prank(user);
        uint256 gasBefore = gasleft();
        noahV1.buildArk(beneficiary, DEADLINE_DURATION, tokens);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("V1 buildArk (5 tokens) gas used", gasUsed);
    }

    function test_GasComparison_BuildArk_V2_5Tokens() public {
        address[] memory tokens = new address[](5);
        tokens[0] = address(token1);
        tokens[1] = address(token2);
        tokens[2] = address(token3);
        tokens[3] = address(token4);
        tokens[4] = address(token5);

        vm.prank(user);
        uint256 gasBefore = gasleft();
        noahV2.buildArk(beneficiary, DEADLINE_DURATION, tokens);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("V2 buildArk (5 tokens) gas used", gasUsed);
    }

    // ===== Ping Ark Gas Comparison =====

    function test_GasComparison_PingArk_V1_5Tokens() public {
        // Setup: Build ark first
        address[] memory tokens = new address[](5);
        tokens[0] = address(token1);
        tokens[1] = address(token2);
        tokens[2] = address(token3);
        tokens[3] = address(token4);
        tokens[4] = address(token5);

        vm.prank(user);
        noahV1.buildArk(beneficiary, DEADLINE_DURATION, tokens);

        // Advance time
        vm.warp(block.timestamp + 10 days);

        // Measure ping gas
        vm.prank(user);
        uint256 gasBefore = gasleft();
        noahV1.pingArk();
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("V1 pingArk (5 tokens) gas used", gasUsed);
    }

    function test_GasComparison_PingArk_V2_5Tokens() public {
        // Setup: Build ark first
        address[] memory tokens = new address[](5);
        tokens[0] = address(token1);
        tokens[1] = address(token2);
        tokens[2] = address(token3);
        tokens[3] = address(token4);
        tokens[4] = address(token5);

        vm.prank(user);
        noahV2.buildArk(beneficiary, DEADLINE_DURATION, tokens);

        // Advance time
        vm.warp(block.timestamp + 10 days);

        // Measure ping gas
        vm.prank(user);
        uint256 gasBefore = gasleft();
        noahV2.pingArk(tokens);
        uint256 gasUsed = gasBefore - gasleft();

        emit log_named_uint("V2 pingArk (5 tokens) gas used", gasUsed);
    }

    // ===== Combined Report Test =====

    function test_GasComparison_FullReport() public {
        address[] memory tokens = new address[](5);
        tokens[0] = address(token1);
        tokens[1] = address(token2);
        tokens[2] = address(token3);
        tokens[3] = address(token4);
        tokens[4] = address(token5);

        // --- V1 Measurements ---
        vm.prank(user);
        uint256 v1BuildGasBefore = gasleft();
        noahV1.buildArk(beneficiary, DEADLINE_DURATION, tokens);
        uint256 v1BuildGas = v1BuildGasBefore - gasleft();

        vm.warp(block.timestamp + 10 days);

        vm.prank(user);
        uint256 v1PingGasBefore = gasleft();
        noahV1.pingArk();
        uint256 v1PingGas = v1PingGasBefore - gasleft();

        // --- V2 Measurements (use different user to avoid state conflicts) ---
        address user2 = makeAddr("user2");

        vm.prank(user2);
        uint256 v2BuildGasBefore = gasleft();
        noahV2.buildArk(beneficiary, DEADLINE_DURATION, tokens);
        uint256 v2BuildGas = v2BuildGasBefore - gasleft();

        vm.prank(user2);
        uint256 v2PingGasBefore = gasleft();
        noahV2.pingArk(tokens);
        uint256 v2PingGas = v2PingGasBefore - gasleft();

        // --- Report ---
        emit log("========================================");
        emit log("    GAS COMPARISON: V1 vs V2 (5 tokens)");
        emit log("========================================");
        emit log("");
        emit log("BUILD ARK:");
        emit log_named_uint("  V1 buildArk gas", v1BuildGas);
        emit log_named_uint("  V2 buildArk gas", v2BuildGas);
        if (v1BuildGas < v2BuildGas) {
            emit log_named_uint("  V1 saves", v2BuildGas - v1BuildGas);
            emit log_named_uint("  V1 cheaper by %", ((v2BuildGas - v1BuildGas) * 100) / v2BuildGas);
        } else {
            emit log_named_uint("  V2 saves", v1BuildGas - v2BuildGas);
            emit log_named_uint("  V2 cheaper by %", ((v1BuildGas - v2BuildGas) * 100) / v1BuildGas);
        }
        emit log("");
        emit log("PING ARK:");
        emit log_named_uint("  V1 pingArk gas", v1PingGas);
        emit log_named_uint("  V2 pingArk gas", v2PingGas);
        if (v1PingGas < v2PingGas) {
            emit log_named_uint("  V1 saves", v2PingGas - v1PingGas);
            emit log_named_uint("  V1 cheaper by %", ((v2PingGas - v1PingGas) * 100) / v2PingGas);
        } else {
            emit log_named_uint("  V2 saves", v1PingGas - v2PingGas);
            emit log_named_uint("  V2 cheaper by %", ((v1PingGas - v2PingGas) * 100) / v1PingGas);
        }
        emit log("");
        emit log("ONGOING COST (10 pings):");
        emit log_named_uint("  V1 total ping cost", v1PingGas * 10);
        emit log_named_uint("  V2 total ping cost", v2PingGas * 10);
        emit log("========================================");
    }

    // ===== Scaling Tests =====

    function test_GasComparison_PingArk_V1_Scaling() public {
        // Test how V1 scales with different token counts
        for (uint256 numTokens = 1; numTokens <= 10; numTokens++) {
            address newUser = makeAddr(string(abi.encodePacked("user", numTokens)));
            address[] memory tokens = _createTokenArray(numTokens);

            vm.prank(newUser);
            noahV1.buildArk(beneficiary, DEADLINE_DURATION, tokens);

            vm.warp(block.timestamp + 1 days);

            vm.prank(newUser);
            uint256 gasBefore = gasleft();
            noahV1.pingArk();
            uint256 gasUsed = gasBefore - gasleft();

            emit log_named_uint(string(abi.encodePacked("V1 pingArk (", _uint2str(numTokens), " tokens)")), gasUsed);
        }
    }

    function test_GasComparison_PingArk_V2_Scaling() public {
        // Test how V2 scales with different token counts
        for (uint256 numTokens = 1; numTokens <= 10; numTokens++) {
            address newUser = makeAddr(string(abi.encodePacked("user", numTokens)));
            address[] memory tokens = _createTokenArray(numTokens);

            vm.prank(newUser);
            noahV2.buildArk(beneficiary, DEADLINE_DURATION, tokens);

            vm.warp(block.timestamp + 1 days);

            vm.prank(newUser);
            uint256 gasBefore = gasleft();
            noahV2.pingArk(tokens);
            uint256 gasUsed = gasBefore - gasleft();

            emit log_named_uint(string(abi.encodePacked("V2 pingArk (", _uint2str(numTokens), " tokens)")), gasUsed);
        }
    }

    // ===== Helper Functions =====

    function _createTokenArray(uint256 count) internal returns (address[] memory) {
        address[] memory tokens = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            MockERC20 token = new MockERC20(
                string(abi.encodePacked("Token", _uint2str(i))),
                string(abi.encodePacked("TK", _uint2str(i)))
            );
            tokens[i] = address(token);
        }
        return tokens;
    }

    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
