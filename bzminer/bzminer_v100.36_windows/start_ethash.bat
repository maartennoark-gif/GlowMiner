@echo off
cd /d %~dp0

REM bzminer v100.36 - sample ethash launcher
REM
REM Ethereum Classic Ethash and etchash on NVIDIA CUDA GPUs, from precompiled
REM cubins - no CUDA toolkit, NVRTC or GPU compiler is needed on the rig.
REM Answers to `ethash`/`ethw`/`ethereumpow` for ETHW and to `etchash`/`etc`
REM for Ethereum Classic; the name selects the DAG epoch schedule, so it must
REM match the chain the pool is serving. The chain's 0x address for that
REM chain. The worker name is a separate --worker argument, not a suffix on
REM the address.
REM
REM EDIT THE WALLET BELOW before running - it is a placeholder, not a real
REM address, and the pool will reject shares sent to it.

REM One line per coin. The FIRST is live; to mine a different coin,
REM comment this one out and uncomment that one.
REM
REM -a picks the chain, so it changes with the pool - and so does the
REM wallet, since every coin has its own address format.
REM Coins: `etchash`, `ethash`.

REM --- Ethereum Classic (etchash)
REM   2Miners
bzminer.exe -a etchash -p stratum+tcp://etc.2miners.com:1010 -w 0xYOUR_ETC_WALLET_HERE --pass x --worker rig1
REM   2Miners, TLS
REM bzminer.exe -a etchash -p stratum+ssl://etc.2miners.com:11010 -w 0xYOUR_ETC_WALLET_HERE --pass x --worker rig1

REM --- EthereumPoW (ethash) - f2pool signs in with your f2pool ACCOUNT NAME, not a wallet address - no wallet-addressed ETHW pool answered on 2026-08-31
REM   F2Pool
REM bzminer.exe -a ethash -p stratum+tcp://ethw.f2pool.com:6688 -w YOUR_F2POOL_ACCOUNT_NAME --pass x --worker rig1

REM --- MoneroOcean (etchash, paid in XMR) (etchash)
REM bzminer.exe -a etchash -p stratum+tcp://gulf.moneroocean.stream:10128 -w 4YOUR_MONERO_WALLET_HERE --pass rig1~etchash --worker rig1

REM Add any of these to the end of the line you are running:
REM   --nvidia                 mine only on NVIDIA (also --amd/--intel/--cpu)
REM   --oc-power-limit 160     see readme.txt for the rest of the --oc-* options
REM   --benchmark              ignore the pool and mine a local test server

pause
