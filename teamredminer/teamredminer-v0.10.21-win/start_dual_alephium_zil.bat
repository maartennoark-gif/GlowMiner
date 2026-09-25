:: These environment variables should be set to for the driver to allow max mem allocation from the gpu(s).
set GPU_MAX_ALLOC_PERCENT=100
set GPU_SINGLE_ALLOC_PERCENT=100
set GPU_MAX_HEAP_SIZE=100
set GPU_USE_SYNC_OBJECTS=1

:: This example file sets up ALPH+ZIL mining. The ZIL configuration is added between the --zil and --zil_end
:: arguments. See the DUAL_ZIL_MINING.txt guide for more info.
::
:: Please change the wallets below to your own before mining.

teamredminer.exe -a alph -o stratum+tcp://de.alephium.herominers.com:1199 -u 1FCzmAUSxjxrmPiJ2AcWfPP73nFyUvCbmBAqcs25PTVCR.trmtest -p x --zil -o zmp://zil.flexpool.io -u zil14fw7uxmrjrlsxdfsjp6razax6ysk2eerc7uryy.trmtest_zil -p x --zil_end --fan_control
