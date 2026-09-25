@echo off

cd /d "%~dp0"

:loop
wildrig.exe --algo ghostrider --url stratum+tcp://stratum-eu.rplant.xyz:7056 --user RCQMzucqevALkHCPKH7xrp5ieLUBwmhLYq --pass x

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Custom command here
timeout /t 5
goto loop