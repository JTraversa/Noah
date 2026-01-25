@echo off
echo Starting local Ethereum node with Anvil...

:: Start Anvil in a new window
start "Anvil" cmd /c "anvil --host 0.0.0.0"

:: Wait for Anvil to start
timeout /t 3 /nobreak > nul

echo Anvil running in separate window
echo.

:: Run the setup script
echo Running local setup script...
forge script scripts/LocalSetup.s.sol:LocalSetup --rpc-url http://localhost:8545 --broadcast

echo.
echo === Local Environment Ready ===
echo RPC URL: http://localhost:8545
echo Chain ID: 31337
echo.
echo Close the Anvil window to stop the node.
pause
