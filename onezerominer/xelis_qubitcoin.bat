@echo off
cd /d %~dp0

:run
onezerominer.exe  -a xelis -w xel:zc0tqcru5sc8ry23e3ry7qk908g9aeqtvlmgahedkzgmcmrcqgyqqpu54e3 -o stratum+tcp://usw.vipor.net:5077  --worker rig_name --a2 qhash --w2 bc1qe5p8vmjlsz0mc8yllhzlrsfhj5ea0zt6pjmyym.worker --p2 x --o2 stratum+tcp://qubitcoin.luckypool.io:8610
goto run
pause