@echo off

cd /d "%~dp0"

:loop

wildrig.exe --print-full --algo ALGORITHM --url POOL:PORT --user WALLET --pass PASSWORD

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Some error happened, put custom command here
timeout /t 5
goto loop