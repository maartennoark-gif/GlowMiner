@echo off

cd /d "%~dp0"

:loop
wildrig.exe --algo kawpow --url stratum+tcp://rvn.2miners.com:6060 --worker test --user RETVhu5dA6EUwpzvkbGxRAVZAmVFimzMQp --pass x

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Custom command here
timeout /t 5
goto loop