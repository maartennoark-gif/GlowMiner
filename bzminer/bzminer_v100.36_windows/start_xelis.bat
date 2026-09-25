@echo off
cd /d %~dp0

REM bzminer v100.36 - sample xelis launcher
REM
REM XELIS xelhash. Wallet addresses start with 'xel:'.
REM
REM EDIT THE WALLET BELOW before running - it is a placeholder, not a real
REM address, and the pool will reject shares sent to it.

REM The first line is live. To use a different pool, comment it out
REM and uncomment one below.

bzminer.exe -a xelis -p stratum+ssl://us.vipor.net:5177 -w xel:YOUR_XELIS_WALLET_HERE --pass x --worker rig1

REM   HeroMiners (TLS)
REM bzminer.exe -a xelis -p stratum+ssl://us.xelis.herominers.com:1225 -w xel:YOUR_XELIS_WALLET_HERE --pass x --worker rig1
REM   SOLO, to your own node
REM bzminer.exe -a xelis -p ws://127.0.0.1:8080 -w xel:YOUR_XELIS_WALLET_HERE --pass x --worker rig1

REM Add any of these to the end of the line you are running:
REM   --nvidia                 mine only on NVIDIA (also --amd/--intel/--cpu)
REM   --oc-power-limit 160     see readme.txt for the rest of the --oc-* options
REM   --benchmark              ignore the pool and mine a local test server

pause
