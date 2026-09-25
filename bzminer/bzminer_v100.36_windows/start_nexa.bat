@echo off
cd /d %~dp0

REM bzminer v100.36 - sample nexa launcher
REM
REM nexa

REM No pool: this runs the built-in benchmark so you can verify the miner
REM works. To mine nexa to a pool, replace the line below with:
REM   bzminer.exe -a nexa -p stratum+tcp://YOUR_POOL:PORT -w YOUR_WALLET_HERE

bzminer.exe --bench -a nexa

pause
