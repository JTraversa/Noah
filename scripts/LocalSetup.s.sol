// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {MockUSDC} from "../contracts/mocks/MockUSDC.sol";
import {Noah} from "../contracts/noah.sol";

contract LocalSetup is Script {
    address constant TEST_WALLET = 0xC93C8DA95c82f4F23d2373294BdA3267E83C81d1;
    uint256 constant ETH_AMOUNT = 100 ether;
    uint256 constant USDC_AMOUNT = 100_000 * 1e6; // 100k USDC

    // Salt for CREATE2 - same salt = same address across chains
    bytes32 constant NOAH_SALT = bytes32(uint256(0x4e6f6168)); // "Noah" in hex

    function run() external {
        // Use Anvil's default private key (account 0)
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        // Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));

        // Deploy Noah V1 using CREATE2 for deterministic address
        Noah noah = new Noah{salt: NOAH_SALT}();
        console.log("Noah V1 deployed at:", address(noah));

        // Fund test wallet with USDC
        usdc.mint(TEST_WALLET, USDC_AMOUNT);
        console.log("Minted", USDC_AMOUNT / 1e6, "USDC to test wallet");

        vm.stopBroadcast();

        // Fund test wallet with ETH (using vm.deal which doesn't need broadcast)
        vm.deal(TEST_WALLET, ETH_AMOUNT);
        console.log("Funded test wallet with", ETH_AMOUNT / 1e18, "ETH");

        console.log("");
        console.log("=== Local Setup Complete ===");
        console.log("Test Wallet:", TEST_WALLET);
        console.log("ETH Balance:", ETH_AMOUNT / 1e18, "ETH");
        console.log("USDC Balance:", USDC_AMOUNT / 1e6, "USDC");
        console.log("USDC Address:", address(usdc));
        console.log("Noah V1 Address:", address(noah));
    }

    // Helper to compute the deterministic address before deployment
    function computeNoahAddress(address deployer) public pure returns (address) {
        bytes32 bytecodeHash = keccak256(type(Noah).creationCode);
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            deployer,
            NOAH_SALT,
            bytecodeHash
        )))));
    }
}
