# Setup Guide for Noah V4

## Prerequisites

Before running the tests, you need to install the required dependencies. The project requires Node.js and npm/yarn.

## Step 1: Install Dependencies

The project now uses standard npm package imports instead of lib/ directory structure.

```bash
# Install all dependencies including Uniswap V4 packages
npm install

# Or with yarn
yarn install
```

**Note**: If you encounter import errors, the contracts now use the correct npm package paths:
- `@openzeppelin/contracts` instead of `lib/openzeppelin-contracts`

## Step 2: Verify Installation

Check that the following packages are installed:
- `@openzeppelin/contracts`
- `hardhat`
- `ethers`
- `chai`

## Step 3: Test Compilation

Before running tests, verify that all contracts compile correctly:

```bash
# Test compilation
npm run compile

# Or use the test script
node test-compile.js
```

## Step 4: Run Tests

```bash
# Run the complete test suite
npm test

# Or with yarn
yarn test
```

## Step 5: Deploy for Testing (Optional)

```bash
# Deploy contracts to local network
npm run deploy

# Or with yarn
yarn deploy
```

## Troubleshooting

### Common Issues

1. **Import Errors**: The contracts now use correct npm package imports. If you still see import errors:
   ```bash
   npm install @openzeppelin/contracts
   ```

2. **Compilation Errors**: Make sure you're using Solidity 0.8.20 or higher and have the viaIR compiler setting enabled.

3. **Test Failures**: Ensure all mock contracts are properly deployed and configured before running tests.

### Import Path Fixes Applied

The following files have been updated to use correct import paths:
- `contracts/NoahV4.sol` ✅
- `contracts/NoahV4Hook.sol` ✅
- `contracts/noah.sol` ✅ (V2 version)
- `test/MockPoolManager.sol` ✅
- `test/MockERC20.sol` ✅ (already correct)

### Network Configuration

The Hardhat configuration includes:
- High gas limits for complex contracts
- viaIR compiler setting for large contracts
- Optimizer enabled for gas efficiency

## Quick Start (Windows)

If you're on Windows, you can use the provided batch file:

```cmd
install-deps.bat
```

Or PowerShell:

```powershell
.\install-deps.ps1
```

## Next Steps

After successful setup:
1. Review the test results
2. Modify contracts as needed
3. Deploy to testnet for further testing
4. Consider gas optimization and security audits

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify all dependencies are installed correctly
3. Ensure Node.js version is 16 or higher
4. Check that Hardhat is properly configured
5. Verify that import paths use `@package-name` format
6. Run `node test-compile.js` to verify compilation works
