@echo off

cd /d "%~dp0"

:loop
wildrig.exe --algo progpow-telestai --url stratum+tcp://stratum.coinminerz.com:3351 --worker test --user wallet --pass x

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Custom command here
timeout /t 5
goto loop