@echo off
cd /d %~dp0

REM bzminer v100.36 - sample PROXY launcher (c29)
REM
REM This machine holds the ONE pool connection for c29 and hands the work to
REM every other bzminer started with start_worker_c29.bat (pointed at this
REM machine's address). Their shares go to the pool through here, each rig's
REM own dev fee is carried through here too (the rigs need no internet of their
REM own), and each rig is a light-blue row in this miner's tables and dashboard
REM (http://127.0.0.1:4014/). The port is TLS.
REM
REM It mines on this machine's own devices as well. For a box that should only
REM proxy, add:   --devices none --cpu 0
REM On anything but a private LAN, set a password the rigs must give:
REM               --proxy_pass <secret>     (and --pass <secret> on each rig)
REM
REM EDIT THE WALLET BELOW before running - it is a placeholder.

bzminer.exe -a c29 -p stratum+tcp://gulf.moneroocean.stream:10128 -w 4YOUR_MONERO_WALLET_HERE --pass x --worker proxy --proxy_port 4100

pause
