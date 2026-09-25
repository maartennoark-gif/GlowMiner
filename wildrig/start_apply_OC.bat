cd /d "%~dp0"

@echo off

net session
if %ERRORLEVEL% neq 0 goto elevate
goto loop
:elevate
MSHTA "javascript: var shell = new ActiveXObject('shell.application'); shell.ShellExecute('%~nx0', '', '', 'runas', 1); close();"
exit

:loop

wildrig.exe --gpu-core-clock VALUE --gpu-memory-clock VALUE --gpu-core-offset VALUE --gpu-memory-offset VALUE --gpu-power-limit VALUE --algo ALGORITHM --url POOL:PORT --user WALLET --pass PASSWORD

if ERRORLEVEL 1 goto custom
timeout /t 5
goto loop

:custom
echo Some error happened, put custom command here
timeout /t 5
goto loop