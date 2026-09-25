@echo off
cd %~dp0
cls

SRBMiner-MULTI.exe --algorithm-gpu quantus --pool qtc.kryptex.network:7049 --wallet quantus-wallet
pause
