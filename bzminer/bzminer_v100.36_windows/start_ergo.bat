@echo off
cd /d %~dp0

REM bzminer v100.36 - sample ergo launcher
REM
REM Ergo Autolykos v2. GPU only, and memory-hard: it builds a table of N
REM 32-byte elements (about 2 GB) in VRAM, so a card needs the room for it. N
REM grows with block height, and the table is rebuilt when it changes. Wallet
REM addresses start with '9'.
REM
REM EDIT THE WALLET BELOW before running - it is a placeholder, not a real
REM address, and the pool will reject shares sent to it.

REM The first line is live. To use a different pool, comment it out
REM and uncomment one below.

bzminer.exe -a ergo -p stratum+tcp://pool.us.woolypooly.com:3100 -w 9YOUR_ERGO_WALLET_HERE --pass x --worker rig1

REM   MoneroOcean - mines Autolykos2, pays in XMR (wallet is an XMR address)
REM bzminer.exe -a ergo -p stratum+tcp://gulf.moneroocean.stream:10128 -w 4YOUR_MONERO_WALLET_HERE --pass rig1~autolykos2 --worker rig1

REM Add any of these to the end of the line you are running:
REM   --nvidia                 mine only on NVIDIA (also --amd/--intel/--cpu)
REM   --oc-power-limit 160     see readme.txt for the rest of the --oc-* options
REM   --benchmark              ignore the pool and mine a local test server

pause
