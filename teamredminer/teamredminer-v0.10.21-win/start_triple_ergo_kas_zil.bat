:: These environment variables should be set to for the driver to allow max mem allocation from the gpu(s).
set GPU_MAX_ALLOC_PERCENT=100
set GPU_SINGLE_ALLOC_PERCENT=100
set GPU_MAX_HEAP_SIZE=100
set GPU_USE_SYNC_OBJECTS=1

:: This example file sets up triple ERG+KAS+ZIL mining. The ZIL configuration is added between the --zil and --zil_end
:: arguments. The KAS config is provided between --kas and --kas_end. See the DUAL_ZIL_MINING.txt guide for more info.
::
:: Please change the wallets below to your own before mining.

teamredminer.exe -a autolykos2 -o stratum+tcp://pool.eu.woolypooly.com:3100 -u 9fTUDDSjg5wRmkEEGNKEw5hrx1ZZNjAcjMFzWfusryk7kvLjww5.trmtest -p x --kas -o stratum+tcp://pool.woolypooly.com:3112 -u kaspa:qq0vgkm89v3k2plkw2cv9t8wrhcqhpxeunq5ayu9mwjghdavalfggat2hu8nn.trmtest -p x --kas_end --zil -o stratum+tcp://eu.ezil.me:4444 -u 0x02101Ff031529661dcAb36614d0Fa5a76e4721B4.zil14fw7uxmrjrlsxdfsjp6razax6ysk2eerc7uryy.trmtest_zil -p x --zil_end
