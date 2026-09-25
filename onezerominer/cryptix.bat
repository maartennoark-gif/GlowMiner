@echo off
cd /d %~dp0

:run
onezerominer.exe -a cryptix -w cryptix:qzqstpthxcmlcglfkrxg85q4mcd3mx3p0z2aeecjpcck8nqlv5lj67ffgw6au -o stratum+tcp://stratum.cryptix-network.org:13095 --worker rig_name
goto run
pause