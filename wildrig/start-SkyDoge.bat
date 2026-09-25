@echo off

cd /d "%~dp0"

:loop
wildrig.exe --algo skydoge --url stratum+tcp://stratum-eu.rplant.xyz:7091 --user 195KzDtaZkHobSLQSGUXfrbZFdZuT59ecD --pass x

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Custom command here
timeout /t 5
goto loop