@echo off

cd /d "%~dp0"

:loop
wildrig.exe --algo progpow-sero --url stratum+tcp://pool2.sero.cash:8808 --worker test --user xHFXE293qQuP5qVXKpsrVVRu7HNyC3KNRJQZ4LXKBmcXzusA9hgdWitdwyhuhpSBTpSF3zvUvZLyTFAnwTDpVtWjGzpwzHZriVwE4dHgGsuAGDZ15B6coaUa4mG5EMdr8NY --pass x

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Custom command here
timeout /t 5
goto loop