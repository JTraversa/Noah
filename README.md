# Noah

A decentralized dead man's switch protocol for trustless crypto inheritance.

## Overview

Noah ensures your digital assets reach your intended beneficiaries in case of loss of life, hardware damage, or loss of wallet access. By creating an "Ark" for your tokens, you establish a trustless inheritance system with no centralized custody or trusted third parties.

### How It Works

1. **Build an Ark** - Configure your beneficiary address, deadline duration, and tokens to protect
2. **Ping periodically** - Signal you're still in control by pinging your Ark before the deadline
3. **Automatic transfer** - If the deadline passes without a ping, anyone can trigger a "flood" that transfers your assets to your beneficiary

The flood mechanism is incentivized through MEV opportunities, ensuring reliable execution without relying on centralized keepers.

## Project Structure

```
├── contracts/          # Solidity smart contracts
│   ├── noah.sol        # Main Noah contract
│   └── interfaces/     # Contract interfaces
├── frontend/           # React frontend application
├── scripts/            # Deployment scripts
├── test/               # Contract tests
└── lib/                # Foundry dependencies
```

## Tech Stack

**Smart Contracts**
- Solidity 0.8.20
- Foundry (Forge, Cast, Anvil)
- OpenZeppelin Contracts

**Frontend**
- React 18
- Vite
- Wagmi + Viem
- RainbowKit
- TailwindCSS

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js v18+
- npm or yarn

### Smart Contracts

```bash
# Install Foundry dependencies
forge install

# Compile contracts
forge build

# Run tests
forge test

# Run tests with verbosity
forge test -vvv
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Local Development

Start a local Anvil node and deploy contracts:

```bash
# Terminal 1: Start Anvil
anvil

# Terminal 2: Deploy contracts
forge script scripts/LocalSetup.s.sol --rpc-url http://localhost:8545 --broadcast
```

## Contract Interface

### Core Functions

| Function | Description |
|----------|-------------|
| `buildArk(beneficiary, deadlineDuration, tokens)` | Create a new Ark with specified beneficiary and tokens |
| `pingArk()` | Reset the deadline timer to signal continued control |
| `flood(user)` | Transfer tokens to beneficiary after deadline passes |
| `destroyArk()` | Deactivate and remove your Ark |

### Ark Management

| Function | Description |
|----------|-------------|
| `addPassengers(tokens)` | Add new tokens to your Ark |
| `removePassenger(token)` | Remove a specific token from your Ark |
| `updateDeadlineDuration(duration)` | Change the deadline duration |
| `getArk(user)` | Query Ark configuration for any address |

### Events

- `ArkBuilt` - Emitted when a new Ark is created
- `ArkPinged` - Emitted when an Ark's deadline is reset
- `FloodTriggered` - Emitted when tokens are transferred to beneficiary
- `PassengersAdded` - Emitted when tokens are added to an Ark
- `PassengerRemoved` - Emitted when a token is removed
- `DeadlineUpdated` - Emitted when deadline duration changes
- `ArkDestroyed` - Emitted when an Ark is destroyed

## Security

- SafeERC20 for all token transfers
- No admin keys or privileged roles
- Permissionless flood execution
- Comprehensive test coverage with fuzz testing

## License

MIT License - see [LICENSE](LICENSE) for details.
