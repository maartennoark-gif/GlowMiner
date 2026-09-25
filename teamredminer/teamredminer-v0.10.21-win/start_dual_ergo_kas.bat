:: These environment variables should be set to for the driver to allow max mem allocation from the gpu(s).
set GPU_MAX_ALLOC_PERCENT=100
set GPU_SINGLE_ALLOC_PERCENT=100
set GPU_MAX_HEAP_SIZE=100
set GPU_USE_SYNC_OBJECTS=1

:: This example file sets up ERG+KAS dual mining using the new mechanism introduced in TRM v0.10.7.
:: The KAS configuration is added between the --kas and --kas_end arguments. See the DUAL_ERGO_MINING.txt
:: guide for more info.
::
:: PLEASE CHANGE the wallets below to your own before mining unless you're only running quick test.

teamredminer.exe -a autolykos2 -o stratum+tcp://pool.eu.woolypooly.com:3100 -u 9fTUDDSjg5wRmkEEGNKEw5hrx1ZZNjAcjMFzWfusryk7kvLjww5.trmtest -p x --kas -o stratum+tcp://pool.woolypooly.com:3112 -u kaspa:qq0vgkm89v3k2plkw2cv9t8wrhcqhpxeunq5ayu9mwjghdavalfggat2hu8nn.trmtest -p x --kas_end
