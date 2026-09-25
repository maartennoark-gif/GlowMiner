:: These environment variables should be set to for the driver to allow max mem allocation from the gpu(s).
set GPU_MAX_ALLOC_PERCENT=100
set GPU_SINGLE_ALLOC_PERCENT=100
set GPU_MAX_HEAP_SIZE=100
set GPU_USE_SYNC_OBJECTS=1

:: This example file sets up ERG+ALPH dual mining using the new mechanism introduced in TRM v0.10.7.
:: The ALPH configuration is added between the --alph and --alph_end arguments. See the DUAL_ERGO_MINING.txt
:: guide for more info.
::
:: PLEASE CHANGE the wallets below to your own before mining unless you're only running quick test.

teamredminer.exe -a autolykos2 -o stratum+tcp://pool.eu.woolypooly.com:3100 -u 9fTUDDSjg5wRmkEEGNKEw5hrx1ZZNjAcjMFzWfusryk7kvLjww5.trmtest -p x --alph -o stratum+tcp://de.alephium.herominers.com:1199 -u 1FCzmAUSxjxrmPiJ2AcWfPP73nFyUvCbmBAqcs25PTVCR.trmtest -p x --alph_end --fan_control
