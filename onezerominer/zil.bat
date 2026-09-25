@echo off
cd /d %~dp0

:run
onezerominer.exe -a zil -w zil1wm9dy34gjhkcuxnhsew0nf0styrktyxh8l8zv3 -o stratum+tcp://us.crazypool.org:5005 -p x --worker rig_name
goto run
pause