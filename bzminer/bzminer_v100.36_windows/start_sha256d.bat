@echo off
cd /d %~dp0

REM bzminer v100.36 - sample sha256d launcher
REM
REM The open-source SDK example: a full algorithm plugin (CPU+GPU, pool
REM stratum, bench job source). Copy plugins/public/sha256d as a template for
REM your own.

REM No pool: this runs the built-in benchmark so you can verify the miner
REM works. To mine sha256d to a pool, replace the line below with:
REM   bzminer.exe -a sha256d -p stratum+tcp://YOUR_POOL:PORT -w YOUR_WALLET_HERE

bzminer.exe --bench -a sha256d

pause
