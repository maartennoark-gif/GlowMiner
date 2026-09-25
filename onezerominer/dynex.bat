@echo off
cd /d %~dp0

:run
onezerominer.exe -a dynex -w XwnsmzNk9JfZHxoHgfKjsReyk5vSjdZeS7H7GgRsdqfv9VZsAnFvDH2TDgnM4X3qjsZrgfgojbnGEZRVepMAQYce28bcdaQre -o dnx.eu.neuropool.net:19330,pool.deepminerz.com:3333 -p x
goto run
pause