@echo off
REM Run Halmos formal verification in Docker

echo Building Halmos Docker image...
docker build -f Dockerfile.halmos -t halmos-verify .

echo.
echo Running Halmos verification on NoahSymbolicTest...
docker run --rm -v "%~dp0:/app" halmos-verify --contract NoahSymbolicTest --solver-timeout-assertion 60000 %*
