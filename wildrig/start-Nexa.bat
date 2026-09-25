@echo off

cd /d "%~dp0"

:loop
wildrig.exe --algo nexapow --url stratum+tcps://eu.rplant.xyz:17092 --user donate --pass x

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Custom command here
timeout /t 5
goto loop