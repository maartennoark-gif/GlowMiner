@echo off
cd /d %~dp0

REM bzminer v100.36 - sample warthog launcher
REM
REM Warthog janushash - the GPU filters sha256t and the CPU runs verushash, on
REM the same nonces. Needs BOTH a GPU and the CPU; one without the other finds
REM nothing. Wallet addresses are 48 hex characters.
REM
REM EDIT THE WALLET BELOW before running - it is a placeholder, not a real
REM address, and the pool will reject shares sent to it.

REM The first line is live. To use a different pool, comment it out
REM and uncomment one below.

bzminer.exe -a warthog -p stratum+ssl://us.vipor.net:5120 -w YOUR_WARTHOG_WALLET_HERE --pass x --worker rig1

REM   WoolyPooly
REM bzminer.exe -a warthog -p stratum+tcp://pool.us.woolypooly.com:3140 -w YOUR_WARTHOG_WALLET_HERE --pass x --worker rig1
REM   acc-pool
REM bzminer.exe -a warthog -p stratum+tcp://acc-pool.pw:12000 -w YOUR_WARTHOG_WALLET_HERE --pass x --worker rig1
REM   SOLO, to your own node over RPC
REM bzminer.exe -a warthog -p http://127.0.0.1:3000 -w YOUR_WARTHOG_WALLET_HERE --pass x --worker rig1
REM   SOLO, to your own node over stratum - run the node with --stratum
REM   0.0.0.0:3456
REM bzminer.exe -a warthog -p stratum+tcp://127.0.0.1:3456 -w YOUR_WARTHOG_WALLET_HERE --pass x --worker rig1

REM Add any of these to the end of the line you are running:
REM   --nvidia                 mine only on NVIDIA (also --amd/--intel/--cpu)
REM   --oc-power-limit 160     see readme.txt for the rest of the --oc-* options
REM   --benchmark              ignore the pool and mine a local test server

pause
