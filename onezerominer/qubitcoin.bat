@echo off
cd /d %~dp0

:run
onezerominer.exe -a qhash -w bc1qhp46zdmzufaq66quq59vd4qafme55a364vr9al.worker -o stratum+tcp://ca.luckypool.io:8611 
goto run
pause