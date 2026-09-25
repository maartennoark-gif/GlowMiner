@echo off
cd /d %~dp0

REM bzminer v100.36 - sample pearl launcher
REM
REM Pearl a zk proof-of-work: each share is a STARK proof, so it is far
REM heavier per hash than a normal algorithm. Also mines SOLO - point -p at
REM your node's RPC URL instead of a pool. Wallet addresses start with 'prl1'.
REM
REM EDIT THE WALLET BELOW before running - it is a placeholder, not a real
REM address, and the pool will reject shares sent to it.

REM The first line is live. To use a different pool, comment it out
REM and uncomment one below.

bzminer.exe -a pearl -p stratum+tcp://us.pearl.herominers.com:1200 -w prl1YOUR_PEARL_WALLET_HERE --pass x --worker rig1

REM   Kryptex
REM bzminer.exe -a pearl -p stratum+tcp://prl-us.kryptex.network:7048 -w prl1YOUR_PEARL_WALLET_HERE --pass x --worker rig1
REM   LuckyPool (EU, CPU pool)
REM bzminer.exe -a pearl -p stratum+tcp://pearl-cpu-eu1.luckypool.io:3370 -w prl1YOUR_PEARL_WALLET_HERE --pass x --worker rig1

REM Add any of these to the end of the line you are running:
REM   --nvidia                 mine only on NVIDIA (also --amd/--intel/--cpu)
REM   --oc-power-limit 160     see readme.txt for the rest of the --oc-* options
REM   --benchmark              ignore the pool and mine a local test server

pause
