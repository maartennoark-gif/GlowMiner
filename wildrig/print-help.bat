@echo off

cd /d "%~dp0"

wildrig.exe --help 1> help.txt
wildrig.exe --help

pause