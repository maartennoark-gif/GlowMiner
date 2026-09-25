@echo off
cd /d %~dp0

:run
onezerominer.exe -a xelis -w xel:zc0tqcru5sc8ry23e3ry7qk908g9aeqtvlmgahedkzgmcmrcqgyqqpu54e3 -o  ssl://pool.vipor.net:5177 --worker rig_name
goto run
pause