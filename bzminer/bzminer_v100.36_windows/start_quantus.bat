@echo off
cd /d %~dp0

REM bzminer v100.36 - sample quantus launcher
REM
REM Quantus Poseidon2 over the Goldilocks field, on NVIDIA and AMD GPUs and
REM the CPU. Also mines SOLO - point -p at your own node's authenticated QUIC
REM miner port instead of a pool. Wallet addresses start with 'q' and are 49
REM characters long.
REM
REM EDIT THE WALLET BELOW before running - it is a placeholder, not a real
REM address, and the pool will reject shares sent to it.

REM The first line is live. To use a different pool, comment it out
REM and uncomment one below.

bzminer.exe -a quantus -p stratum+tcp://us-east.lproute.com:5660 -w qYOUR_QUANTUS_ADDRESS_HERE --pass x --worker rig1 --intensity 512

REM   LuckyPool (US west)
REM bzminer.exe -a quantus -p stratum+tcp://us-west.lproute.com:5660 -w qYOUR_QUANTUS_ADDRESS_HERE --pass x --worker rig1 --intensity 512
REM   LuckyPool (Europe)
REM bzminer.exe -a quantus -p stratum+tcp://eu.lproute.com:5660 -w qYOUR_QUANTUS_ADDRESS_HERE --pass x --worker rig1 --intensity 512
REM   LuckyPool (Singapore)
REM bzminer.exe -a quantus -p stratum+tcp://sg.lproute.com:5660 -w qYOUR_QUANTUS_ADDRESS_HERE --pass x --worker rig1 --intensity 512
REM   Kryptex - takes a Kryptex account name or a wallet; bzminer sends
REM   Kryptex's wallet/worker form rather than wallet.worker
REM bzminer.exe -a quantus -p stratum+tcp://qtc.kryptex.network:7049 -w qYOUR_QUANTUS_ADDRESS_HERE --pass x --worker rig1 --intensity 512
REM   quanpool (Europe, main server) - PPLNS, 1% fee. This pool speaks QUIC
REM   over UDP rather than stratum, so open outbound UDP to the port. The pin
REM   below is quanpool's published certificate fingerprint and is the same
REM   for every region.
REM bzminer.exe -a quantus -p quic://eu.quanpool.com:9834 -w qYOUR_QUANTUS_ADDRESS_HERE --pass x --worker rig1 --intensity 512 --quantus.tls-pin 87dc37af6096a3ddc860b94368ca087775f3ad3e0c4e9bcff3b07ea08d8abef6
REM   quanpool (North America, Montreal) - PPLNS
REM bzminer.exe -a quantus -p quic://us.quanpool.com:9834 -w qYOUR_QUANTUS_ADDRESS_HERE --pass x --worker rig1 --intensity 512 --quantus.tls-pin 87dc37af6096a3ddc860b94368ca087775f3ad3e0c4e9bcff3b07ea08d8abef6
REM   quanpool (Asia, Singapore) - PPLNS
REM bzminer.exe -a quantus -p quic://asia.quanpool.com:9834 -w qYOUR_QUANTUS_ADDRESS_HERE --pass x --worker rig1 --intensity 512 --quantus.tls-pin 87dc37af6096a3ddc860b94368ca087775f3ad3e0c4e9bcff3b07ea08d8abef6
REM   quanpool SOLO - the same pool and the same address; port 9844 instead of
REM   9834 is the whole difference. You keep a full block when you find one,
REM   and earn nothing in between.
REM bzminer.exe -a quantus -p quic://eu.quanpool.com:9844 -w qYOUR_QUANTUS_ADDRESS_HERE --pass x --worker rig1 --intensity 512 --quantus.tls-pin 87dc37af6096a3ddc860b94368ca087775f3ad3e0c4e9bcff3b07ea08d8abef6
REM   SOLO against your own node (quantus-node --validator --miner-listen-port
REM   9833). The node picks the reward account, so the wallet on this line is
REM   ignored. Both files below live in the node's chain data directory.
REM bzminer.exe -a quantus -p quic://127.0.0.1:9833 -w qYOUR_QUANTUS_ADDRESS_HERE --pass x --worker rig1 --intensity 512 --quantus.auth-token-file C:\quantus\node-data\chains\dev\miner-auth-token --quantus.tls-pin-file C:\quantus\node-data\chains\dev\miner-tls-cert-sha256

REM Add any of these to the end of the line you are running:
REM   --nvidia                 mine only on NVIDIA (also --amd/--intel/--cpu)
REM   --oc-power-limit 160     see readme.txt for the rest of the --oc-* options
REM   --benchmark              ignore the pool and mine a local test server

pause
