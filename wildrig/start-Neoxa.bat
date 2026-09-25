@echo off

cd /d "%~dp0"

:loop
wildrig.exe --algo kawpow --url stratum+tcps://stratum-eu.rplant.xyz:17069 --worker test --user PoolDonateWallet --pass x

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Custom command here
timeout /t 5
goto loop