#!/bin/bash
set -e

echo "=== Installing Foundry dependencies ==="
forge install --no-commit 2>/dev/null || true

echo "=== Cleaning and compiling contracts with Forge ==="
forge clean
forge build --ast

echo "=== Running Halmos formal verification ==="
halmos "$@"
