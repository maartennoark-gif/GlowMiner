@echo off
cd /d %~dp0

REM bzminer v100.36 - sample verus launcher
REM
REM VERUS VerusHash v2.2 CPU mining. A Verus R-address. The worker name is a
REM separate --worker argument, not a suffix on the address.
REM
REM EDIT THE WALLET BELOW before running - it is a placeholder, not a real
REM address, and the pool will reject shares sent to it.

bzminer.exe -a verus -p stratum+ssl://bzdev.vipor.net:5140 -w YOUR_VERUS_WALLET --pass x --worker rig1

REM Add any of these to the end of the line you are running:
REM   --nvidia                 mine only on NVIDIA (also --amd/--intel/--cpu)
REM   --oc-power-limit 160     see readme.txt for the rest of the --oc-* options
REM   --benchmark              ignore the pool and mine a local test server

pause
