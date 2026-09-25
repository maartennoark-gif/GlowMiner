@echo off
cd /d %~dp0

REM bzminer v100.36 - sample kawpow launcher
REM
REM Ravencoin KawPow on NVIDIA CUDA, AMD OpenCL, and Apple Metal GPUs. NVIDIA
REM specializes the three-block random program through the driver's PTX JIT,
REM with precompiled cubins as its fallback; AMD uses offline-native gfx code
REM objects; Apple Silicon uses a portable offline metallib. No CUDA toolkit,
REM NVRTC, ROCm compiler, OpenCL C source, Metal source, or external GPU
REM compiler is required on the mining rig; the AMD and Apple paths do no
REM runtime compilation. Answers to `kawpow` and to each KawPow coin by name
REM (rvn, xna, neoxa, meowcoin, clore), which selects the chain you mine. A
REM wallet address for the coin being mined. The worker name is a separate
REM --worker argument, not a suffix on the address.
REM
REM EDIT THE WALLET BELOW before running - it is a placeholder, not a real
REM address, and the pool will reject shares sent to it.

REM One line per coin. The FIRST is live; to mine a different coin,
REM comment this one out and uncomment that one.
REM
REM -a picks the chain, so it changes with the pool - and so does the
REM wallet, since every coin has its own address format.
REM Coins: `rvn`, `xna`, `neoxa`, `meowcoin`, `clore`, `kawpow`.

REM --- Ravencoin (rvn)
REM   WoolyPooly US
bzminer.exe -a rvn -p stratum+ssl://pool.us.woolypooly.com:55555 -w RYOUR_RAVENCOIN_WALLET_HERE --pass x --worker rig1
REM   2Miners
REM bzminer.exe -a rvn -p stratum+ssl://rvn.2miners.com:16060 -w RYOUR_RAVENCOIN_WALLET_HERE --pass x --worker rig1

REM --- Neurai (xna)
REM   rplant - Neurai is on the ASIA host only
REM bzminer.exe -a xna -p stratum+ssl://stratum-asia.rplant.xyz:17029 -w NYOUR_NEURAI_WALLET_HERE --pass x --worker rig1

REM --- Neoxa (neoxa)
REM   rplant EU
REM bzminer.exe -a neoxa -p stratum+ssl://stratum-eu.rplant.xyz:17069 -w GYOUR_NEOXA_WALLET_HERE --pass x --worker rig1

REM --- Meowcoin (meowcoin)
REM   rplant EU
REM bzminer.exe -a meowcoin -p stratum+ssl://stratum-eu.rplant.xyz:17120 -w MYOUR_MEOWCOIN_WALLET_HERE --pass x --worker rig1

REM --- Clore (clore)
REM   rplant EU
REM bzminer.exe -a clore -p stratum+ssl://stratum-eu.rplant.xyz:17063 -w AYOUR_CLORE_WALLET_HERE --pass x --worker rig1
REM   rplant Asia
REM bzminer.exe -a clore -p stratum+ssl://stratum-asia.rplant.xyz:17063 -w AYOUR_CLORE_WALLET_HERE --pass x --worker rig1

REM --- MoneroOcean (any KawPow coin, paid in XMR) (kawpow)
REM bzminer.exe -a kawpow -p stratum+tcp://gulf.moneroocean.stream:10128 -w 4YOUR_MONERO_WALLET_HERE --pass rig1~kawpow --worker rig1

REM Add any of these to the end of the line you are running:
REM   --nvidia                 mine only on NVIDIA (also --amd/--intel/--cpu)
REM   --oc-power-limit 160     see readme.txt for the rest of the --oc-* options
REM   --benchmark              ignore the pool and mine a local test server

pause
