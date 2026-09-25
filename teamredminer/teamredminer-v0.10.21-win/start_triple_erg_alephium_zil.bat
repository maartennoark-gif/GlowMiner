:: These environment variables should be set to for the driver to allow max mem allocation from the gpu(s).
set GPU_MAX_ALLOC_PERCENT=100
set GPU_SINGLE_ALLOC_PERCENT=100
set GPU_MAX_HEAP_SIZE=100
set GPU_USE_SYNC_OBJECTS=1

:: This example file sets up ERG+ALPH+ZIL triple mining.
::
:: PLEASE CHANGE the wallets below to your own before mining unless you're only running quick test.

teamredminer.exe -a autolykos2 -o stratum+tcp://pool.eu.woolypooly.com:3100 -u 9fTUDDSjg5wRmkEEGNKEw5hrx1ZZNjAcjMFzWfusryk7kvLjww5.trmtest -p x --alph -o stratum+tcp://de.alephium.herominers.com:1199 -u 1FCzmAUSxjxrmPiJ2AcWfPP73nFyUvCbmBAqcs25PTVCR.trmtest -p x --alph_end --zil -o zmp://zil.flexpool.io -u zil14fw7uxmrjrlsxdfsjp6razax6ysk2eerc7uryy.trmtest_zil -p x --zil_end --fan_control
