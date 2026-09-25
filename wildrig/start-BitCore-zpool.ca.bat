@echo off

cd /d "%~dp0"

:loop
wildrig.exe --algo megabtx --url stratum+tcp://megabtx.mine.zpool.ca:3558 --user sY7v3ieNguMPRd8XkzGdUtASDZFrCvdAmn --pass c=BTX,zap=BTX

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Custom command here
timeout /t 5
goto loop