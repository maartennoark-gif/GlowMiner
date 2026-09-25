@echo off
cd /d %~dp0

:run
onezerominer.exe -a xelis -w xel:zc0tqcru5sc8ry23e3ry7qk908g9aeqtvlmgahedkzgmcmrcqgyqqpu54e3 -o  ssl://pool.vipor.net:5177 --worker rig_name --a2 zil --w2 zil1wm9dy34gjhkcuxnhsew0nf0styrktyxh8l8zv3 --p2 x --o2 stratum+tcp://us.crazypool.org:5005  --worker2 rig_name 
goto run
pause