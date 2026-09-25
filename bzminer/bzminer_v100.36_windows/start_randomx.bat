@echo off
cd /d %~dp0

REM bzminer v100.36 - sample randomx launcher
REM
REM Monero, Zephyr, Salvium RandomX (rx/0) on NVIDIA CUDA, AMD OpenCL and the
REM CPU: Monero, plus Zephyr and Salvium, which run it unmodified. Written
REM from the specification rather than vendored. On the CPU the virtual
REM machine is compiled at run time, with code generator tiers for BMI2,
REM AVX-512 and VAES. On a GPU the same program runs eight threads to a hash
REM against a schedule built once per program, one cubin per NVIDIA
REM architecture from Pascal to Blackwell and a native object per AMD
REM architecture from Vega through RDNA 4. No CUDA toolkit is required on the
REM rig. A Monero address. The worker name is a separate --worker argument,
REM not a suffix on the address.
REM
REM EDIT THE WALLET BELOW before running - it is a placeholder, not a real
REM address, and the pool will reject shares sent to it.

REM The first line is live. To use a different pool, comment it out
REM and uncomment one below.

bzminer.exe -a randomx -p stratum+ssl://gulf.moneroocean.stream:20128 -w YOUR_MONERO_WALLET --pass x --worker rig1

REM   MoneroOcean (plain)
REM bzminer.exe -a randomx -p stratum+tcp://gulf.moneroocean.stream:10128 -w YOUR_MONERO_WALLET --pass x --worker rig1
REM   SupportXMR (TLS)
REM bzminer.exe -a randomx -p stratum+ssl://pool.supportxmr.com:9000 -w YOUR_MONERO_WALLET --pass x --worker rig1
REM   SupportXMR (plain)
REM bzminer.exe -a randomx -p stratum+tcp://pool.supportxmr.com:3333 -w YOUR_MONERO_WALLET --pass x --worker rig1
REM   HeroMiners
REM bzminer.exe -a randomx -p stratum+tcp://monero.herominers.com:1111 -w YOUR_MONERO_WALLET --pass x --worker rig1
REM   HashVault
REM bzminer.exe -a randomx -p stratum+tcp://pool.hashvault.pro:3333 -w YOUR_MONERO_WALLET --pass x --worker rig1

REM Add any of these to the end of the line you are running:
REM   --nvidia                 mine only on NVIDIA (also --amd/--intel/--cpu)
REM   --oc-power-limit 160     see readme.txt for the rest of the --oc-* options
REM   --benchmark              ignore the pool and mine a local test server

pause
