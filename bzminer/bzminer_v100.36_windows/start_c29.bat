@echo off
cd /d %~dp0

REM bzminer v100.36 - sample c29 launcher
REM
REM Tari Tari original Cuckaroo29 (C29/CR29), experimental NVIDIA CUDA mining
REM with an automatic RTX 3090 profile. Every 42-edge proof is checked by the
REM portable Tari consensus reference before submission. Monero wallet at
REM MoneroOcean; Tari wallet at a direct XTM-C29 pool.
REM
REM EDIT THE WALLET BELOW before running - it is a placeholder, not a real
REM address, and the pool will reject shares sent to it.

REM One line per coin. The FIRST is live; to mine a different coin,
REM comment this one out and uncomment that one.
REM
REM -a picks the chain, so it changes with the pool - and so does the
REM wallet, since every coin has its own address format.
REM Coins: `c29`.

REM --- MoneroOcean (Tari C29, paid in XMR) (c29)
REM   C29-pinned login; current artifact 8F3593B8...E023 had three fee shares accepted through bzproxy with zero rejects on 2026-09-05
bzminer.exe -a c29 -p stratum+tcp://gulf.moneroocean.stream:10128 -w 4YOUR_MONERO_WALLET_HERE --pass rig1~c29 --worker rig1

REM --- Tari (c29)
REM   One live bzminer share accepted with zero rejects on 2026-09-04;
REM   functional validation only
REM bzminer.exe -a c29 -p stratum+tcp://taric29.luckypool.io:3111 -w YOUR_TARI_WALLET_HERE --pass x --worker rig1
REM   Preserved artifact 5C01EE2E...FE46: one live share accepted with zero
REM   rejects in the 180-second revalidation on 2026-09-05
REM bzminer.exe -a c29 -p stratum+tcp://xtm-c29-us.kryptex.network:7040 -w YOUR_TARI_WALLET_HERE --pass x --worker rig1

REM Add any of these to the end of the line you are running:
REM   --nvidia                 mine only on NVIDIA (also --amd/--intel/--cpu)
REM   --oc-power-limit 160     see readme.txt for the rest of the --oc-* options
REM   --benchmark              ignore the pool and mine a local test server

pause
