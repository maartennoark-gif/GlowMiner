@echo off
cd /d %~dp0

REM bzminer v100.36 - sample TWO-ALGORITHM launcher
REM
REM pearl on the GPUs and randomx on the CPU, at the same time, in one miner.
REM
REM -a takes a list. The first algorithm is 1 and the second is 2, and every
REM pool flag carries that number: --p1/--w1 are pearl's, --p2/--w2 are
REM randomx's. A second --p1 is a failover pool for pearl.
REM
REM Nothing says which device mines what, because nothing needs to: randomx
REM cannot use a GPU, so pearl takes every card, and the CPU is shared - each
REM algorithm gets half of the rig's CPU threads, on separate processors. To
REM change that, add any of these to the line:
REM   --cpu_threads1 4 --cpu_threads2 24   give each algorithm its own count
REM   --devices1 gpu                       keep pearl off the CPU entirely
REM   --cpu_affinity2 8-31                 name randomx's processors outright
REM   --cpu_threads 28                     the rig-wide budget the split comes from
REM
REM EDIT BOTH WALLETS BELOW before running - they are placeholders, not real
REM addresses, and the pools will reject shares sent to them.

bzminer.exe -a pearl,randomx --p1 stratum+tcp://us.pearl.herominers.com:1200 --w1 prl1YOUR_PEARL_WALLET_HERE --pass1 x --worker1 rig1 --p2 stratum+ssl://gulf.moneroocean.stream:20128 --w2 YOUR_MONERO_WALLET --pass2 x --worker2 rig1

REM Other pools for either algorithm are listed, one per line, in start_pearl.bat
REM and start_randomx.bat; carry one over as another --p1 or --p2.
REM Both algorithms share the dashboard at http://127.0.0.1:4014/.

pause
