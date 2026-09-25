cd /d "%~dp0"

@echo off

net session
if %ERRORLEVEL% neq 0 goto elevate
goto loop
:elevate
MSHTA "javascript: var shell = new ActiveXObject('shell.application'); shell.ShellExecute('%~nx0', '', '', 'runas', 1); close();"
exit

:loop
wildrig.exe --gpu-memory-clock 810 --algo sha512256d --url stratum+tcp://sha512256d.mine.zpool.ca:3342 --user 12ZGJpB8CZNZsPjX6Nm7r9qUZuTFmM6s1A --pass c=RXD,zap=RXD

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Custom command here
timeout /t 5
goto loop