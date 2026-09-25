================================================================================
 bzminer v100.36  (windows)            PUBLIC BETA
================================================================================

A GPU/CPU cryptocurrency miner. This is a BETA: it mines, it has been validated
on real pools, and it is still new. Watch it before you leave it unattended.


QUICK START
--------------------------------------------------------------------------------
1. Open one of the start_* scripts in a text editor and put YOUR wallet
   address in it. The wallets shipped here are placeholders - the pool will
   reject shares sent to them.

2. Run it:
    start_c29.bat (double-click), or from a command prompt:
    bzminer.exe -a c29 -o <pool> -w <wallet>

3. Open http://127.0.0.1:4014/ in a browser for the live dashboard.


WHAT IS IN THIS FOLDER
--------------------------------------------------------------------------------
  bzminer.exe
      The miner. It needs no installation and writes nothing outside its folder
      except the log and the config you point it at.

  config.txt
      A fully commented copy of every setting, generated from this exact build,
      so it can never describe an option this binary does not have. bzminer reads
      config.txt from its own folder if present; use --config <path> for another.

      It may be EITHER of two things, and bzminer works out which:

        * JSON, the file shipped here - everything inside one { } object.
        * A COMMAND LINE: the options you would have typed, in a file. Write one
          option per line, or a flag and its value on the same line; quote a value
          containing a space, and start a comment line with #.

              # this file is a command line
              -a pearl
              -p stratum+tcp://pool:1234
              -w YOUR_WALLET
              --worker "My Rig"

      The second form is what mining OSes generate, and it is also the easier one
      to write by hand. Anything you actually type on the command line wins over
      the file's copy of the same option, so the file is a default you can
      override without editing it.

  readme.txt
      This file.

  Sample launchers (edit the wallet first):
  start_c29.bat         Tari Tari original Cuckaroo29 (C29/CR29), experimental
                        NVIDIA CUDA mining with an automatic RTX 3090 profile.
                        Every 42-edge proof is checked by the portable Tari
                        consensus reference before submission. Monero wallet
                        at MoneroOcean; Tari wallet at a direct XTM-C29 pool.
  start_cn.bat          CryptoNight The CryptoNight family on NVIDIA CUDA,
                        AMD/Intel OpenCL, Apple Metal and the CPU: cn/gpu
                        (Conceal, Ryo - the variant the live chains run) plus
                        the eighteen classic variants cn/0, cn/1, cn/2,
                        cn/fast, cn/half, cn/xao, cn/rto, cn/rwz, cn/zls,
                        cn/double, cn/ccx, cn-lite/0, cn-lite/1, cn-heavy/0,
                        cn-heavy/xhv, cn-pico, cn-pico/tlo and cn/upx2 - on
                        NVIDIA one kernel, one cubin per architecture from
                        Pascal (GTX 10xx) to Blackwell; on AMD and Intel the
                        same six kernels in OpenCL, offline-compiled to SPIR-V
                        plus a native object per GCN/RDNA architecture; on the
                        CPU a kernel per instruction set (AES-NI, AVX2,
                        AVX-512) chosen at run time, so one build serves Zen 1
                        through Zen 5, EPYC and Intel. `-a cn` lets an
                        auto-switching pool (MoneroOcean) choose the variant
                        per job; naming one mines that variant. No CUDA
                        toolkit is required on the rig. The wallet address of
                        the coin being mined - a Monero address at
                        MoneroOcean, whatever the variant. The worker name is
                        a separate --worker argument, not a suffix on the
                        address.
  start_ergo.bat        Ergo Autolykos v2. GPU only, and memory-hard: it
                        builds a table of N 32-byte elements (about 2 GB) in
                        VRAM, so a card needs the room for it. N grows with
                        block height, and the table is rebuilt when it
                        changes. Wallet addresses start with '9'.
  start_ethash.bat      Ethereum Classic Ethash and etchash on NVIDIA CUDA
                        GPUs, from precompiled cubins - no CUDA toolkit, NVRTC
                        or GPU compiler is needed on the rig. Answers to
                        `ethash`/`ethw`/`ethereumpow` for ETHW and to
                        `etchash`/`etc` for Ethereum Classic; the name selects
                        the DAG epoch schedule, so it must match the chain the
                        pool is serving. The chain's 0x address for that
                        chain. The worker name is a separate --worker
                        argument, not a suffix on the address.
  start_kawpow.bat      Ravencoin KawPow on NVIDIA CUDA, AMD OpenCL, and Apple
                        Metal GPUs. NVIDIA specializes the three-block random
                        program through the driver's PTX JIT, with precompiled
                        cubins as its fallback; AMD uses offline-native gfx
                        code objects; Apple Silicon uses a portable offline
                        metallib. No CUDA toolkit, NVRTC, ROCm compiler,
                        OpenCL C source, Metal source, or external GPU
                        compiler is required on the mining rig; the AMD and
                        Apple paths do no runtime compilation. Answers to
                        `kawpow` and to each KawPow coin by name (rvn, xna,
                        neoxa, meowcoin, clore), which selects the chain you
                        mine. A wallet address for the coin being mined. The
                        worker name is a separate --worker argument, not a
                        suffix on the address.
  start_nexa.bat        nexa
  start_pearl.bat       Pearl a zk proof-of-work: each share is a STARK proof,
                        so it is far heavier per hash than a normal algorithm.
                        Also mines SOLO - point -p at your node's RPC URL
                        instead of a pool. Wallet addresses start with 'prl1'.
  start_quantus.bat     Quantus Poseidon2 over the Goldilocks field, on NVIDIA
                        and AMD GPUs and the CPU. Also mines SOLO - point -p
                        at your own node's authenticated QUIC miner port
                        instead of a pool. Wallet addresses start with 'q' and
                        are 49 characters long.
  start_randomx.bat     Monero, Zephyr, Salvium RandomX (rx/0) on NVIDIA CUDA,
                        AMD OpenCL and the CPU: Monero, plus Zephyr and
                        Salvium, which run it unmodified. Written from the
                        specification rather than vendored. On the CPU the
                        virtual machine is compiled at run time, with code
                        generator tiers for BMI2, AVX-512 and VAES. On a GPU
                        the same program runs eight threads to a hash against
                        a schedule built once per program, one cubin per
                        NVIDIA architecture from Pascal to Blackwell and a
                        native object per AMD architecture from Vega through
                        RDNA 4. No CUDA toolkit is required on the rig. A
                        Monero address. The worker name is a separate --worker
                        argument, not a suffix on the address.
  start_sha256d.bat     The open-source SDK example: a full algorithm plugin
                        (CPU+GPU, pool stratum, bench job source). Copy
                        plugins/public/sha256d as a template for your own.
  start_verus.bat       VERUS VerusHash v2.2 CPU mining. A Verus R-address.
                        The worker name is a separate --worker argument, not a
                        suffix on the address.
  start_warthog.bat     Warthog janushash - the GPU filters sha256t and the
                        CPU runs verushash, on the same nonces. Needs BOTH a
                        GPU and the CPU; one without the other finds nothing.
                        Wallet addresses are 48 hex characters.
  start_xelis.bat       XELIS xelhash. Wallet addresses start with 'xel:'.
  start_multi_algo.bat  Both at once: pearl on the GPUs and randomx on the
                        CPU. Starts two miners - one algorithm per process is
                        what bzminer does - and splits the machine between
                        them.
  start_proxy_c29.bat   A farm on ONE pool connection: this box mines c29 and
                        serves the work to every rig started with
                        start_worker_c29; their shares and their own dev fees
                        go up through here (the rigs need no internet), and
                        each rig is a light-blue row in this miner's tables.
                        --devices none for a box that only proxies.
  start_worker_c29.bat  Mine c29 through the proxy (edit PROXY-IP), the real
                        pool as the backup. Give each rig its own --worker
                        name.


COMMON OPTIONS
--------------------------------------------------------------------------------
  -a <algo>              algorithm: c29, cn, ergo, ethash, kawpow, nexa, pearl, quantus, randomx, sha256d, verus, warthog, xelis, cn/gpu, cryptonight/gpu, cryptonight-gpu, cn-gpu, cn/0, cn/1, cn/2, cn/fast, cn/half, cn/xao, cn/rto, cn/rwz, cn/zls, cn/double, cn/ccx, cn-lite/0, cn-lite/1, cn-heavy/0, cn-heavy/xhv, cn-pico, cn-pico/tlo, cn/upx2, cryptonight, cryptonight/0, cryptonight/1, cryptonight-monerov7, cryptonight/2, cryptonight-monerov8, cn/msr, cryptonight/fast, cryptonight/half, cryptonight/xao, cryptonight/rto, cryptonight/rwz, cryptonight/zls, cryptonight/double, cn/conceal, cryptonight/ccx, cryptonight-conceal, cn-lite, cn-light, cryptonight-lite/0, cryptonight-lite/1, cryptonight-aeonv7, cn-heavy, cryptonight-heavy/0, cryptonight-heavy/xhv, cryptonight-haven, cn-pico/0, cn-pico/trtl, cn-trtl, cn-ultralite, cryptonight-turtle, cn/ultra, cn-talleo, cn-extremelite/upx2, cryptonight-upx/2, etchash, etc, ethw, ethereumpow, rvn, ravencoin, xna, neurai, neox, neoxa, mewc, meowcoin, clore, pearlhash, rx/0, xmr, monero, zeph, zephyr, sal, salvium
  -p <url>  or  --url    pool, e.g. stratum+ssl://host:port  (ssl/tls = encrypted)
  -w <wallet>            your payout address
  --worker <name>        rig name shown on the pool
  --pass <pass>          pool password (most pools ignore it; "x" is normal)
  -o <name>              console screen: tui (default), log, monitor
  --bench                mine a local test job - no pool, no network
  --dmon                 hardware monitoring + dashboard only, no mining
  --help                 every option, with its config-file path
  --config-doc           print the commented config template

Note -p is the POOL URL, as it was in bzminer 1.x. The password is --pass.
-o now picks the console screen (short for --output); a URL handed to it is
still taken as a pool, with a warning, so an old start script keeps working.

Press 'c' while it runs to open a command line (try `help`, `oc`, `pause`).


THE SCREENS
--------------------------------------------------------------------------------
Three of them. Press 'o' to cycle, or start on one with -o <name>.

  tui       the boxed dashboard - devices, shares, pool, log pane. The default
            whenever there is a terminal
  log       plain scrolling log; the device table is reprinted every 30s
            (--log-table-interval <ms>, 0 = every update). The automatic choice
            when output is redirected to a file
  monitor   one dense sensors table, nvidia-smi dmon style

HOTKEYS
  o        next screen              c        command line ('help' lists commands)
  +  -     more / less log detail   p        pause and resume mining
  d        device detail page       q        quit
  h        every key, with what each one is currently set to

  i  I     refresh faster / slower  - how often every screen and the web API are
           updated. Lower case speeds up. This is --interval, live, so it also
           changes what the web dashboard sees

  n        aim the tuning keys at the next card
  g  G     core clock OFFSET, up / down     (+/- 15 MHz)
  l  L     core clock LOCK, up / down       (+/- 15 MHz)
  m  M     memory clock OFFSET, up / down   (+/- 50 MHz)
  k  K     memory clock LOCK, up / down     (the card's own steps)
  w  W     board POWER CAP, up / down       (5% of the card's own range)
  t  T     CPU mining threads, up / down

A locked clock and an offset are different settings and a card can carry both,
which is why each has its own key: 'g' and 'm' always move an offset, 'l' and 'k'
always move a lock. The memory lock steps through the clocks the board publishes
as lockable, because those are the only values a driver will accept - one press
is one memory state, not a fixed number of MHz.

The tuning keys move ONE card, not the rig. 'n' picks which, and its row is marked
with a '>' in the device tables. Rig-wide is 'oc all core=+150' from the command
line, where you have to type the word.

Every step starts from what the card is ACTUALLY set to, read back per device, so
a rig started with an offset in config.txt does not jump when you first press a
key. If a card refuses a setting it says so rather than reporting it as applied.

On the tui, the log pane scrolls with the wheel, the arrows, PageUp/PageDown and
Home/End. While it is scrolled up it holds still and the bar shows
"held N up [End] live"; End follows the newest line again. Selecting and copying
text keeps working at the same time - bzminer does not take the mouse away from
the terminal to read the wheel.

How fast they refresh - there are three separate knobs and they are easy to
confuse:

  --interval <ms>             how often the DATA is sampled and published
                              (default 1000). Everything reads this: the tui, the
                              log table, the monitor screen and the web API. This
                              is the one the i/I keys change, live
  --tui-interval <ms>         how often the tui REDRAWS (default 400). Redrawing
                              faster than the data changes just costs CPU
  --log-table-interval <ms>   how often the 'log' screen reprints the device
                              table (default 30000, 0 = every update)

So a monitor session that feels too fast wants --interval or the 'i'/'I' keys,
not --tui-interval.


TESTING WITHOUT A POOL
--------------------------------------------------------------------------------
Two ways to make the miner work without pointing it at anyone. Neither needs a
wallet, an account, or even an internet connection.

  --bench -a <algo>
      Mine a job made up locally. No network at all. Answers "does this machine
      mine this algorithm" - it runs the kernels and nothing else.

  --benchmark [difficulty] -a <algo>
      bzminer starts a real stratum server inside itself and then connects to it
      over TCP, like any other pool. The whole client path runs: subscribe,
      authorize, job, share submit, the pool's verdict, the a/r/s counters and
      the pool-hashrate column. This is the honest way to measure a card, because
      a share only counts once the server has accepted it.

        bzminer --benchmark -a warthog                  (default difficulty 1000)
        bzminer --benchmark 25000000000000 -a pearl     (fixed difficulty, 25T)

Choose the difficulty deliberately. Too low and a fast rig floods the local
server and measures the plumbing instead of the card; too high and you wait a
long time for enough shares to mean anything. Aim for a share every few seconds.

The share count is the number to trust: shares x difficulty / seconds is a rate
the miner cannot flatter. Compare it to the displayed hashrate - if the two
disagree for long, one of them is lying.

Both modes accept everything else, so you can benchmark one vendor
(--nvidia) or measure at a given power limit (--oc-power-limit 300).


READING THE MINING TABLE
--------------------------------------------------------------------------------
The cfg column says how each device is CONFIGURED rather than what it is doing:
i64 is a GPU at intensity 64, i0 a GPU on auto, t16 a CPU mining on 16 threads.
It is the quickest way to confirm a setting actually took.

Under the summary row's pool hr is that rate as a percentage of the miner's own:

    100%   the pool is crediting exactly what your rig reports
    < 100% it is finding fewer shares than its hashrate implies
    > 100% luck has run your way

It is the number to watch if a miner looks fast but pays badly. Expect it to
swing over minutes and settle over hours - it is computed from accepted shares,
so a short run says very little.

The hashrate itself is an average over a window, because a GPU's hash counter
advances one batch at a time and an un-averaged rate would read 0, 0, 0, BURST, 0.

    --hashrate-window 30     seconds to average over (default 30)

Raise it for a calmer number on a bursty rig, lower it to see an intensity or
thread change take effect sooner. The 'avg' figure is unaffected - that is
always since start.


CHOOSING WHICH DEVICES MINE
--------------------------------------------------------------------------------
By default every device mines - every GPU and the CPU. Two ways to narrow that.

By TYPE, on the command line:

    --nvidia --amd --intel --cpu

  Naming any of them makes those the ONLY ones that mine. So `--nvidia` mines
  the NVIDIA cards and nothing else, and `--nvidia --cpu` adds the CPU back.

  Or give a value to change just one type and leave the rest alone:

    --amd 0                  stop mining on AMD, keep everything else
    --nvidia 1               make sure NVIDIA is on

By SINGLE DEVICE, in config.txt - useful when you have four identical cards and
one of them is doing something else:

    "devices": [ { "index": 2, "enabled": false } ]

  The index counts every device the miner finds, in the order it lists them at
  startup, so turning one off does not renumber the others.


TWO ALGORITHMS AT ONCE
--------------------------------------------------------------------------------
bzminer mines every algorithm you give it at the same time, each on its own
devices, in one process. -a takes a list, and the position in that list is what
every other pool flag carries:

    bzminer -a pearl,randomx --p1 <pool> --w1 <wallet> --p2 <pool> --w2 <wallet>

    --p1, --w1, --worker1, --pass1    algorithm 1 (pearl)
    --p2, --w2, --worker2, --pass2    algorithm 2 (randomx)

No suffix means algorithm 1, so a one-algorithm command line is unchanged.
WHERE a flag sits on the line means nothing - only its number does. A second
--p1 is a failover pool for algorithm 1. start_multi_algo.bat is this, filled in.

WHICH DEVICES. A GPU mines one algorithm; the CPU is shared. Unset, the cards
are dealt out among the algorithms that can use them and the CPU's threads are
split evenly between the algorithms that mine it, on separate processors - so
pearl + randomx needs no device flag at all (randomx cannot use a GPU). To
say otherwise:

    --devices1 gpu           pearl on the cards only, nothing on the CPU
    --devices2 cpu           randomx on the CPU only (it is anyway)
    --devices1 0,1           by device number or pci id, as --devices takes
    --cpu_threads1 4         pearl's share of the CPU, as a thread count
    --cpu_threads2 24        randomx's; unset = an even split of --cpu_threads
    --cpu_affinity2 8-31     randomx's processors, named outright

Counts are placed on unused processors first: 32 + 32 on a 64-thread CPU is two
disjoint halves. Once they add up to more than there are, the rest overlap and
share - said in the log, never refused.

In config.txt it is the same pools[] list: entries with the same algo are one
algorithm (primary first, the rest failovers), and each entry may carry
"devices", "cpu_threads" and "cpu_affinity". "pool": [0, 2] still picks which
entries are live. Every algorithm gets its own box on the mining screen and
its own row on the dashboard.


FARM ON ONE POOL CONNECTION (BZPROXY)
--------------------------------------------------------------------------------
One bzminer can hold the pool connection for an algorithm and serve the work to
every other bzminer on your network:

    bzminer -a c29 -p <pool> -w <wallet> --proxy_port 4100          the proxy
    bzminer -a c29 -p bzproxy://<proxy ip>:4100 --worker rig1       a rig

The rigs mine the proxy's jobs and their shares go to the pool through the
proxy's one connection. Each rig keeps its own dev fee, and pays it through the
proxy as well: its fee connection is tunnelled to the fee pool from the rig, so
the rigs need no internet of their own. The proxy signals its own
slice so the whole farm pays in one window. Every rig is a
light-blue row in the proxy's tables and dashboard, named by its --worker,
with its hashrate, power, hottest card and shares; the device page ([d] key)
and the dashboard open a rig's row to show its own cards. The proxy mines on
its own devices too, or on none: add --devices none for a box that only
proxies. start_proxy_c29.bat and start_worker_c29.bat are the two
lines above, filled in.

Keep a real pool behind the proxy on every rig (a second -p): if the proxy
goes away the rig fails over to it, and comes back when the proxy does. The
pool sees one worker - the proxy's - for the whole farm, which is the point
and the price: per-rig statistics live in the proxy, not at the pool. The
listener is TLS, with a certificate made fresh each start that the rigs pin
through their handshake; outside a private LAN, also set --proxy_pass <secret>
on the proxy and --pass <secret> on each rig. Run the same bzminer version on
every machine of a farm.


DUPLICATING DEVICES
--------------------------------------------------------------------------------
One card can mine as several independent instances. Each one gets its own
compute context, its own workers and its own share counters, so the mining
table shows a row per instance rather than a row per card.

    --duplicate-devices 1    one EXTRA instance of every CPU and GPU, so two
                             of each. 0 (the default) makes none; the most is 63

  To change just one card, name it and repeat the option:

    --duplicate-device 33:0=1 --duplicate-device 255:0=0

  The same thing in config.txt, where a per-device count overrides the
  rig-wide one:

    "duplicate_devices": 1,
    "devices": [ { "pci": "33:0", "duplicates": 2 },
                 { "pci": "255:0", "duplicates": 0 } ]

  `duplicates` defaults to -1, which means "use duplicate_devices".

WHAT THE COPIES ARE CALLED. Existing device numbers do not change - copies are
added after them. A GPU copy takes the next free ID on its own bus (33:0, 33:1,
33:2), skipping IDs that belong to real cards; CPU instances are 255:0, 255:1;
a device with no PCI address becomes gpu<index>:<instance>. The roster printed
at startup lists every instance's ID, which is what to look at before writing a
selector.

Copies answer to the ordinary device selectors, so one algorithm can use both
of them, or two pool entries can take 33:0 and 33:1 and mine the same algorithm
in two groups. With --devices<N> the two halves of one card can even mine
different algorithms.

The hardware is still one piece of hardware: copies share its VRAM,
processors, sensors, fans and clocks, and rig power counts it once. Each GPU
instance needs enough FREE VRAM for its own allocations, so a card that barely
fits one instance of an algorithm will not fit two.

OVERCLOCKING
--------------------------------------------------------------------------------
NVIDIA cards only. On Windows the power limit and fan apply without any special
privileges; on Linux every one of these is a privileged driver write, so run as
root or they will be refused (bzminer says which knob was refused, and why).

    --oc-power-limit 160             board power cap, watts
    --oc-core-clock-offset 150       core offset, MHz
    --oc-memory-clock-offset 1000    memory offset, MHz
    --oc-lock-core-clock 1600        pin the core clock instead of letting it
                                     boost around; 0 unlocks it again
    --oc-lock-memory-clock 810       pin the memory clock; 0 unlocks
    --oc-reset                       put every card back to driver defaults

Each takes one value for all cards, or one per card: --oc-power-limit 160,180

FAN CONTROL takes either a fixed duty or a temperature target:

    --oc-fan-speed 60                just run the fan at 60%

    --oc-fan-speed "t:60[25-75]"     hold the CORE at 60C, using anywhere
                                     between 25% and 75% fan to do it

    --oc-fan-speed "tm:80[50-100]"   the same, but aiming at the MEMORY
                                     temperature instead

    --oc-fan-speed "t:60[25-75] tm:80[50-100]"
                                     both at once - whichever is asking for more
                                     fan wins. Worth doing: a card can sit at a
                                     perfectly comfortable core temperature while
                                     its memory cooks.

The fan moves gradually toward the target rather than jumping, and stays inside
the range you gave.

ONE CARD AT A TIME. Everything above applies to every GPU that is mining. To
give one card its own settings, use the `devices` section of config.txt - bzminer
fills in which card each entry is the first time it runs, so you only have to
find the one you want and fill in the fields you care about:

    "devices": [
      {
        "pci": "0000:09:00",
        "name": "NVIDIA GeForce RTX 3060",
        "architecture": "Ampere",
        "pci_subsystem_id": "1043:8818",
        "core_clock_offset": "250",
        "fan_speed": "70"
      }
    ]

Anything left blank uses the global `oc` value, so an entry only has to say what
is different about that card. Entries are matched on `pci`, which does not move
when a card is added or removed - `name`, `architecture` and `pci_subsystem_id`
are there so the file says what it means without the rig in front of you.

A card keeps a fan duty or a locked clock until something clears it - so if a run
is KILLED rather than closed, the settings stay behind. `bzminer --oc-reset` on
its own undoes them.

TWO KINDS OF CLOCK. An OFFSET shifts the card's whole curve and it still boosts;
a LOCK pins it. A card can carry both, which is why the dashboard gives each one
its own key ('g' core offset, 'l' core lock, 'm' memory offset, 'k' memory lock)
and why the two are separate settings here.
A locked MEMORY clock is only accepted at one of the board's own supported values
- bzminer tells you which one you will get if you ask for something else.

bzminer 1.x wrote these with underscores (--oc_power_limit, --oc_fan_speed).
Those spellings still work, so an old start script does not need editing.


PROTECTING YOUR HARDWARE
--------------------------------------------------------------------------------
bzminer can stop mining on a card that gets too hot or draws too much, and start
it again once it recovers. Nothing is enabled by default; every limit is off (0)
until you set one:

    --set safety.max_temp_c=85          pause a GPU over 85C
    --set safety.max_power_w=600        ...or over 600W board power
    --set safety.sustain_s=15           only after 15s over the limit

Only the card that tripped stops - the rest of the rig keeps mining, and it
resumes on its own once it cools. Temperature is the limit to set first: it works
on every card, and a connector or VRM in trouble gets hot.

There are also 12VHPWR current limits (safety.max_current_a, and per-pin
safety.max_pin_current_a). Read the notes in config.txt before relying on them -
they need sensors that only some cards have.


THE WEB DASHBOARD AND API
--------------------------------------------------------------------------------
A full build serves a dashboard and a JSON API on port 4014:

    http://127.0.0.1:4014

It shows per-device hashrate, shares, temperature and power, pushed live, and
it can apply overclocks through the same code the console and command line use,
so the three cannot disagree. It listens on localhost only; to reach it from
another machine on your LAN, --set http_address=0.0.0.0 - and read the warning
below first. --set http_enabled=false turns it off entirely. A lite build
without the webui plugin has no web server at all.

START, PAUSE AND STOP MINING OVER HTTP. Anything that changes the machine is a
POST, never a GET, because a browser prefetch or a plain refresh fires a GET:

    POST /api/mining   {"action":"start"}     resume, or rebuild after a stop
                       {"action":"pause"}     park the mining threads
                       {"action":"stop"}      tear the session down
    GET  /api/mining                          read it back: mining, paused or
                                              stopped

"resume" is accepted as a synonym for "start". A monitoring-only run has no
session to act on, and answers every one of these with available:false.

PAUSE keeps everything - device memory, the pool connection, the dev-fee clock -
and picks up the next job with nothing to rebuild. It is the same state the 'p'
hotkey toggles, so the dashboard and the screen always agree.

STOP joins the mining threads, hands device memory back and disconnects the
pools, while the rig stays up serving telemetry and this API. Starting again
costs whatever a cold start costs on that algorithm - on a DAG coin, minutes.

Asking for the state a rig is already in succeeds, so a farm controller can stop
twenty rigs without tracking which were already stopped. Share counters and
uptime survive both.

THERE IS NO PASSWORD ON THIS, the same as the overclock endpoint. Anyone who can
reach the port can stop your miner or change your clocks. Keep it on localhost
unless something in front of it authenticates.

The rest of the API, for scripting or your own dashboard:

    /api/snapshot      everything: devices, pools, hashrate, shares
    /api/stream        the same, pushed as it changes (WebSocket)
    /api/oc            read and apply overclocks
    /api/gpus, /api/metrics, /api/topology, /api/ram, /api/storage
                       hardware detail
    /status            the shape other mining dashboards expect
    /hive_status       HiveOS


TROUBLESHOOTING
--------------------------------------------------------------------------------
"no GPUs found"        Install/refresh your GPU driver. --gpu-info lists what
                       bzminer can see; --list-metrics shows every sensor.

Pool rejects shares    Almost always the wallet: check you replaced the
                       placeholder, and that it is an address for the right coin.

Overclock does nothing On Linux, clock/power/fan changes are privileged - run as
                       root. bzminer tells you which knob the driver refused and
                       why, rather than failing silently.

Nothing on the web UI  It listens on 127.0.0.1 only. For another machine on your
                       LAN: --set http_address=0.0.0.0 (understand the exposure
                       before you do this).


A NOTE ON THE DEV FEE
--------------------------------------------------------------------------------
Some algorithms mine to the developer for a small percentage of the time. It is
stated by each algorithm and printed in the log at startup, so you can see
exactly what it is before you commit a rig to it.

================================================================================
