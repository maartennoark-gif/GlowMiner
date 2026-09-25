@echo off

cd /d "%~dp0"

:loop
wildrig.exe --algo pearlhash --url pool.pearlhash.xyz:9000 --user prl1p50ltku2jjcwdxh4nzjrw98nwdswdn25qdkr2fdtw8hsq3qu9cdhscchnnm --worker test

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Custom command here
timeout /t 5
goto loop