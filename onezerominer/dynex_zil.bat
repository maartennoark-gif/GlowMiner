@echo off
cd /d %~dp0

:run
onezerominer.exe -a dynex -w XwnsmzNk9JfZHxoHgfKjsReyk5vSjdZeS7H7GgRsdqfv9VZsAnFvDH2TDgnM4X3qjsZrgfgojbnGEZRVepMAQYce28bcdaQre -o dnx.eu.neuropool.net:19330,pool.deepminerz.com:3333 -p x --a2 zil --w2 zil1wm9dy34gjhkcuxnhsew0nf0styrktyxh8l8zv3 --p2 x --o2 stratum+tcp://us.crazypool.org:5005  --worker2 rig_name 
goto run
pause