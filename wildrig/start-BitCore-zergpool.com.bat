@echo off

cd /d "%~dp0"

:loop
wildrig.exe --algo megabtx --url stratum+tcp://megabtx.mine.zergpool.com:3557 --user sY7v3ieNguMPRd8XkzGdUtASDZFrCvdAmn --pass c=BTX,mc=BTX

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Custom command here
timeout /t 5
goto loop