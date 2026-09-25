@echo off

cd /d "%~dp0"

echo PLATFORMS:
wildrig.exe --print-platforms

echo.
echo DEVICES:  
wildrig.exe --print-devices

pause