@echo off
cd /d %~dp0

REM bzminer v100.36 - sample cn launcher
REM
REM CryptoNight The CryptoNight family on NVIDIA CUDA, AMD/Intel OpenCL, Apple
REM Metal and the CPU: cn/gpu (Conceal, Ryo - the variant the live chains run)
REM plus the eighteen classic variants cn/0, cn/1, cn/2, cn/fast, cn/half,
REM cn/xao, cn/rto, cn/rwz, cn/zls, cn/double, cn/ccx, cn-lite/0, cn-lite/1,
REM cn-heavy/0, cn-heavy/xhv, cn-pico, cn-pico/tlo and cn/upx2 - on NVIDIA one
REM kernel, one cubin per architecture from Pascal (GTX 10xx) to Blackwell; on
REM AMD and Intel the same six kernels in OpenCL, offline-compiled to SPIR-V
REM plus a native object per GCN/RDNA architecture; on the CPU a kernel per
REM instruction set (AES-NI, AVX2, AVX-512) chosen at run time, so one build
REM serves Zen 1 through Zen 5, EPYC and Intel. `-a cn` lets an auto-switching
REM pool (MoneroOcean) choose the variant per job; naming one mines that
REM variant. No CUDA toolkit is required on the rig. The wallet address of the
REM coin being mined - a Monero address at MoneroOcean, whatever the variant.
REM The worker name is a separate --worker argument, not a suffix on the
REM address.
REM
REM EDIT THE WALLET BELOW before running - it is a placeholder, not a real
REM address, and the pool will reject shares sent to it.

REM One line per coin. The FIRST is live; to mine a different coin,
REM comment this one out and uncomment that one.
REM
REM -a picks the chain, so it changes with the pool - and so does the
REM wallet, since every coin has its own address format.
REM Coins: `cn`, `cn/gpu`.

REM --- MoneroOcean (CryptoNight, paid in XMR) (cn)
REM   MoneroOcean (TLS) - the ~cn/gpu pin in the password is REQUIRED; without it the login is refused with 'No block template yet. Please wait.' (re-checked 2026-09-04)
bzminer.exe -a cn -p stratum+ssl://gulf.moneroocean.stream:20128 -w 4YOUR_MONERO_WALLET_HERE --pass rig1~cn/gpu --worker rig1
REM   MoneroOcean (plain) - same, the ~cn/gpu pin is required (re-checked
REM   2026-09-04)
REM bzminer.exe -a cn -p stratum+tcp://gulf.moneroocean.stream:10128 -w 4YOUR_MONERO_WALLET_HERE --pass rig1~cn/gpu --worker rig1

REM --- Conceal (cn/gpu)
REM   Conceal's community pool - answers logins (validates the address)
REM bzminer.exe -a cn/gpu -p stratum+tcp://pool.conceal.network:3333 -w ccx7YOUR_CONCEAL_WALLET_HERE --pass x --worker rig1
REM   GNTL
REM bzminer.exe -a cn/gpu -p stratum+tcp://ccx.pool.gntl.co.uk:3333 -w ccx7YOUR_CONCEAL_WALLET_HERE --pass x --worker rig1
REM   Cedric Crispin (TLS) - answers logins; 3364 plain
REM bzminer.exe -a cn/gpu -p stratum+ssl://conceal.cedric-crispin.com:3365 -w ccx7YOUR_CONCEAL_WALLET_HERE --pass x --worker rig1

REM --- Ryo (cn/gpu)
REM   MoneroOcean - add ~cn/gpu to the password to pin; pays in XMR
REM bzminer.exe -a cn/gpu -p stratum+tcp://gulf.moneroocean.stream:10128 -w 4YOUR_MONERO_WALLET_HERE --pass x --worker rig1

REM Add any of these to the end of the line you are running:
REM   --nvidia                 mine only on NVIDIA (also --amd/--intel/--cpu)
REM   --oc-power-limit 160     see readme.txt for the rest of the --oc-* options
REM   --benchmark              ignore the pool and mine a local test server

pause
