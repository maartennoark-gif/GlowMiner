:: These environment variables should be set to for the driver to allow max mem allocation from the gpu(s).
set GPU_MAX_ALLOC_PERCENT=100
set GPU_SINGLE_ALLOC_PERCENT=100
set GPU_MAX_HEAP_SIZE=100
set GPU_USE_SYNC_OBJECTS=1

:: This example file sets up ETH+ALPH dual mining using the new mechanism introduced in TRM v0.9.2.
:: The Ironfish configuration is added between the --alph and --alph_end arguments. See the DUAL_ETH_MINING.txt
:: guide for more info.
::
:: PLEASE CHANGE the wallets below to your own before mining unless you're only running quick test.

teamredminer.exe -a etchash -o stratum+tcp://eu1-etc.ethermine.org:4444 -u 0x02197021fefa795fec661a45f60e47a6f6605281.trmtest -p x --alph -o stratum+tcp://de.alephium.herominers.com:1199 -u 1FCzmAUSxjxrmPiJ2AcWfPP73nFyUvCbmBAqcs25PTVCR.trmtest -p x --alph_end --fan_control
