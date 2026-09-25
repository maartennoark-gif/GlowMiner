@echo off

cd /d "%~dp0"

:loop
wildrig.exe --algo evrprogpow --url stratum+tcp://eu.evrpool.org:1111 --user EXvMVgsLdLFQkHrA63F4nS2WpKwuMxtAKH --pass x

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Custom command here
timeout /t 5
goto loop