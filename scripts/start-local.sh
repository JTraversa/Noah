#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting local Ethereum node with Anvil...${NC}"

# Start Anvil in background
anvil --host 0.0.0.0 &
ANVIL_PID=$!

# Wait for Anvil to start
sleep 2

echo -e "${GREEN}Anvil running with PID: $ANVIL_PID${NC}"
echo ""

# Run the setup script
echo -e "${YELLOW}Running local setup script...${NC}"
forge script scripts/LocalSetup.s.sol:LocalSetup --rpc-url http://localhost:8545 --broadcast

echo ""
echo -e "${GREEN}=== Local Environment Ready ===${NC}"
echo "RPC URL: http://localhost:8545"
echo "Chain ID: 31337"
echo ""
echo "To stop Anvil, run: kill $ANVIL_PID"
echo ""

# Keep script running to maintain Anvil
wait $ANVIL_PID
