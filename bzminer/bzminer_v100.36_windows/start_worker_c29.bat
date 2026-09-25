@echo off
cd /d %~dp0

REM bzminer v100.36 - sample WORKER launcher (c29)
REM
REM Mines c29 THROUGH the bzminer running start_proxy_c29.bat: no pool
REM connection of its own. It still pays its OWN dev fee - the proxy carries
REM that connection too, so this rig needs no route to the internet, and the
REM proxy signals when the farm's slice is due so the whole farm pays in one
REM window. The real pool is listed second, so if the proxy goes away this rig
REM fails over to it and mines it directly.
REM
REM EDIT the proxy's address (PROXY-IP) and give each rig its own --worker name:
REM that name is what the proxy's tables show for it.

bzminer.exe -a c29 -p bzproxy://PROXY-IP:4100 -p stratum+tcp://gulf.moneroocean.stream:10128 -w 4YOUR_MONERO_WALLET_HERE --pass x --worker rig1

pause
