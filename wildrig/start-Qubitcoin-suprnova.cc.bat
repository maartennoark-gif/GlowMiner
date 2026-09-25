@echo off

cd /d "%~dp0"

:loop
wildrig.exe --algo qhash --url stratum+tcp://qtc.suprnova.cc:5555 --user bc1qe5p8vmjlsz0mc8yllhzlrsfhj5ea0zt6pjmyym --pass x

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Custom command here
timeout /t 5
goto loop