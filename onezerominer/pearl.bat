@echo off
cd /d %~dp0

:run
onezerominer.exe -a pearl -w prl1pa3yzm6eqs9xwz2dnlawydk39ehyc9amvz30kx4ucm723p5ql9rvqqwe3hu -o stratum+tcp://prl.suprnova.cc:3373 
goto run
pause