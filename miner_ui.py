"""
7900 XTX Mini-Miner - Black Glowing White UI (Windows, single EXE)
- Wallet, Coin-Auswahl (XNA / CLORE / DNX), Leistungs-Regler (nur Intensity, KEIN OC/UV)
- Steuert BzMiner als Subprozess. BzMiner wird beim ersten Start auto-geladen.
"""
import json
import queue
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox
from pathlib import Path
import urllib.request
import webbrowser
import zipfile

# ---------- Pfade (PyInstaller-safe) ----------
def get_app_dir() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).parent

APP_DIR = get_app_dir()
CONFIG_PATH = APP_DIR / "config.json"
DEFAULT_BZMINER = APP_DIR / "bzminer" / "bzminer.exe"

# ---------- Miner-Registry (alle gängigen, AMD 7900 XTX) ----------
# Jeder Miner: exe-Relativpfad, GitHub-Repo für Auto-Download, unterstützte Algos,
# Hashrate-Regex wird generisch geparst (H/s, kH/s, MH/s, GH/s).
MINERS = {
    "bzminer": {
        "label": "BzMiner (alle Coins)",
        "exe_rel": "bzminer/bzminer.exe",
        "repo": "bzminer/bzminer",
        "supports": ["xna", "clore", "dynex"],
        "note": "KawPow + Dynex auf AMD. Intensity-Slider wird unterstützt.",
    },
    "teamredminer": {
        "label": "TeamRedMiner (AMD-King für KawPow)",
        "exe_rel": "teamredminer/teamredminer.exe",
        "repo": "todxx/teamredminer",
        "supports": ["xna", "clore"],
        "note": "Bester AMD KawPow-Miner. Kein Dynex.",
    },
    "srbminer": {
        "label": "SRBMiner-Multi (AMD Allround)",
        "exe_rel": "srbminer/SRBMiner-MULTI.exe",
        "repo": "doktor83/SRBMiner-Multi",
        "supports": ["xna", "clore"],
        "note": "KawPow auf AMD. Kein DynexSolve.",
    },
    "wildrig": {
        "label": "WildRig-Multi (AMD Alt)",
        "exe_rel": "wildrig/wildrig.exe",
        "repo": "andru-kun/wildrig-multi",
        "supports": ["xna", "clore"],
        "note": "KawPow-Fallback für AMD.",
    },
    "onezerominer": {
        "label": "OneZeroMiner (Xelis/Dynex-NVIDIA)",
        "exe_rel": "onezerominer/onezerominer.exe",
        "repo": "OneZeroMiner/onezerominer",
        "supports": ["dynex"],
        "note": "Dynex primär NVIDIA – auf 7900 XTX meist schwächer, zum Vergleich dabei.",
    },
}

# Algo-Mapping pro Miner (BzMiner nutzt Coin-Namen, andere den Algo-Familiennamen)
MINER_ALGO = {
    "bzminer": {"xna": "xna", "clore": "clore", "dynex": "dynex"},
    "teamredminer": {"xna": "kawpow", "clore": "kawpow"},
    "srbminer": {"xna": "kawpow", "clore": "kawpow"},
    "wildrig": {"xna": "kawpow", "clore": "kawpow"},
    "onezerominer": {"dynex": "dynex"},
}

BENCH_DEFAULT_SEC = 60

# ---------- Coins ----------
COINS = {
    "Neurai (XNA) - AI IoT, MEXC verkaufbar": {
        "algo": "xna",
        "pools": [
            "stratum+tcp://pool.woolypooly.com:3128",
            "stratum+tcp://xna.2miners.com:6060",
        ],
        "default_pool": "stratum+tcp://pool.woolypooly.com:3128",
        "hint": "Block 3000 XNA | Netz ~31 GH/s | Wallet: XNA-Adresse oder MEXC-Deposit",
        "extra_args": [],
    },
    "Clore (CLORE) - AI-Compute, liquide": {
        "algo": "clore",
        "pools": [
            "stratum+tcp://pool.woolypooly.com:3118",
            "stratum+tcp://clore.2miners.com:6060",
        ],
        "default_pool": "stratum+tcp://pool.woolypooly.com:3118",
        "hint": "KawPow-Fork | Wallet: CLORE-Adresse",
        "extra_args": [],
    },
    "Dynex (DNX) - AI PoUW, ULTRA-LEICHT": {
        "algo": "dynex",
        "pools": [
            "stratum+tcp://fr-dynex.miningocean.org:3332",
            "stratum+tcp://dnx.neuropool.net:2222",
            "stratum+tcp://us-east.dnx.minenow.space:18443",
        ],
        "default_pool": "stratum+tcp://fr-dynex.miningocean.org:3332",
        "hint": "Netz nur ~2 MH/s | Reward ~8 DNX | Nur NonKYC, Volumen winzig - Lotto!",
        "extra_args": ["--nc", "1"],
    },
}

# ---------- Coin-Suche: Schätzwerte (7900 XTX Hashrates, WhatToMine live) ----------
# Hashrates in H/s bei 100% Leistung (7900 XTX Defaults, skaliert mit Leistungs-Regler)
EST_HASHRATE = {
    "KawPow": 58e6,
    "DynexSolve": 2500.0,
    "Xelishashv3": 10500.0,
    "FishHash": 67e6,
    "Autolykos": 190e6,
    "Octopus": 111e6,
    "Etchash": 100e6,
    "Karlsenhashv2": 67e6,
    "NexaPow": 93e6,
}
# Tags die wir im Estimate-Board zeigen (minebar + gängige Alternativen)
EST_TAGS = ["XNA", "DNX", "RVN", "XEL", "ERG", "CFX", "IRON", "KLS", "EPIC", "XTM", "ZANO"]
# Kuratierte Börsen-Infos (WTM liefert nur Volumen, keine Venue-Namen)
EXCHANGES = {
    "XNA": ("MEXC (XNA/USDT)", "ok"),
    "CLORE": ("MEXC / Gate (CLORE/USDT)", "ok"),
    "DNX": ("NonKYC (DNX/USDT)", "dünn"),
    "RVN": ("Binance / MEXC u.a.", "ok"),
    "XEL": ("CoinEx / NonKYC — vorab prüfen", "dünn"),
    "ERG": ("KuCoin / Gate u.a.", "ok"),
    "CFX": ("Binance u.a.", "ok"),
    "IRON": ("MEXC / Gate", "mittel"),
    "KLS": ("kaum gelistet", "kaum verkaufbar"),
    "PYI": ("kaum gelistet", "kaum verkaufbar"),
    "EPIC": ("NonKYC", "dünn"),
    "XTM": ("CoinEx / Gate", "mittel"),
    "ZANO": ("CoinEx / MEXC", "ok"),
}
MINEABLE_TAGS = {"XNA", "DNX", "CLORE"}

# ---------- Theme ----------
BG = "#000000"
PANEL = "#0a0a0a"
ENTRY_BG = "#101010"
BORDER = "#2a2a2a"
GLOW = "#ffffff"
DIM = "#8a8a8a"
GREEN = "#e8e8e8"


def load_config():
    if CONFIG_PATH.exists():
        try:
            return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_config(data):
    try:
        CONFIG_PATH.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


class GlowHeader(tk.Canvas):
    """Titel mit simuliertem White-Glow (mehrfach versetzte Texte) + Puls."""
    def __init__(self, parent, text, subtext=""):
        super().__init__(parent, bg=BG, highlightthickness=0, height=86)
        self.text = text
        self.subtext = subtext
        self.phase = 0
        self.bind("<Configure>", lambda e: self.redraw())
        self.redraw()
        self.pulse()

    def redraw(self):
        self.delete("all")
        w = self.winfo_width() or 640
        # Glow-Layer: graue Ghosts rundherum
        for dx, dy, col in [(-2, 0, "#333"), (2, 0, "#333"), (0, -2, "#333"),
                            (0, 2, "#333"), (-1, -1, "#666"), (1, 1, "#666")]:
            self.create_text(w // 2 + dx, 30 + dy, text=self.text,
                             font=("Segoe UI", 20, "bold"), fill=col)
        self.create_text(w // 2, 30, text=self.text,
                         font=("Segoe UI", 20, "bold"), fill=GLOW)
        self.create_text(w // 2, 60, text=self.subtext,
                         font=("Segoe UI", 9), fill=DIM)

    def pulse(self):
        # dezentes Atmen der Unterzeile
        self.phase += 1
        c = "#aaaaaa" if (self.phase // 8) % 2 == 0 else "#ffffff"
        try:
            self.itemconfig(2, fill=c)
        except Exception:
            pass
        self.after(500, self.pulse)


def glow_label(parent, text, size=10, bold=False, dim=False):
    """Label mit Glow-Schatten (zwei übereinanderliegende Labels)."""
    wrap = tk.Frame(parent, bg=BG)
    weight = "bold" if bold else "normal"
    shadow = tk.Label(wrap, text=text, font=("Segoe UI", size, weight),
                      bg=BG, fg="#3a3a3a")
    shadow.place(x=1, y=1)
    fg = tk.Label(wrap, text=text, font=("Segoe UI", size, weight),
                  bg=BG, fg=DIM if dim else GLOW, wraplength=620, justify="left")
    fg.pack()
    wrap.shadow = shadow
    wrap.fg = fg
    return wrap


def dark_entry(parent, textvar=None, width=None):
    e = tk.Entry(parent, textvariable=textvar, bg=ENTRY_BG, fg=GLOW,
                 insertbackground=GLOW, relief="flat", highlightthickness=1,
                 highlightbackground=BORDER, highlightcolor=GLOW,
                 font=("Consolas", 10))
    if width:
        e.config(width=width)
    return e


def glow_button(parent, text, cmd, accent=False):
    b = tk.Button(parent, text=text, command=cmd, bg="#0d0d0d" if not accent else "#f2f2f2",
                  fg=GLOW if not accent else "#000000",
                  activebackground=GLOW, activeforeground="#000000",
                  relief="flat", bd=1, highlightthickness=1,
                  highlightbackground=GLOW, highlightcolor=GLOW,
                  font=("Segoe UI", 10, "bold"), padx=16, pady=8, cursor="hand2")
    def on_enter(_e):
        b.config(bg="#1c1c1c" if not accent else "#ffffff",
                 highlightthickness=2)
    def on_leave(_e):
        b.config(bg="#0d0d0d" if not accent else "#f2f2f2",
                 highlightthickness=1)
    b.bind("<Enter>", on_enter)
    b.bind("<Leave>", on_leave)
    return b


class MinerUI(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("7900 XTX Miner")
        self.geometry("700x1000")
        self.minsize(640, 760)
        self.configure(bg=BG)

        self.cfg = load_config()
        self.proc = None
        self.log_q = queue.Queue()
        self.ex_mode = "own"  # own | exchange (bei Split-Rotation)
        self.ex_timer_id = None

        root = tk.Frame(self, bg=BG)
        root.pack(fill="both", expand=True, padx=16, pady=12)

        # Header
        GlowHeader(root, "7900 XTX  MINER", "NEURAI  •  CLORE  •  DYNEX  —  black / glowing white").pack(fill="x", pady=(0, 8))
        self._divider(root)

        # Miner-Auswahl + Benchmark
        glow_label(root, "MINER-SOFTWARE", size=9, bold=True, dim=True).pack(anchor="w")
        mrow = tk.Frame(root, bg=BG)
        mrow.pack(fill="x", pady=4)
        miner_labels = [MINERS[k]["label"] for k in MINERS]
        self.miner_labels = miner_labels
        self.miner_keys = list(MINERS.keys())
        saved_miner = self.cfg.get("miner", "bzminer")
        if saved_miner not in MINERS:
            saved_miner = "bzminer"
        self.miner_var = tk.StringVar(value=MINERS[saved_miner]["label"])
        self.miner_menu = tk.OptionMenu(mrow, self.miner_var, *miner_labels, command=lambda _: self._on_miner_change())
        self.miner_menu.config(bg=ENTRY_BG, fg=GLOW, activebackground="#1c1c1c",
                               activeforeground=GLOW, relief="flat", highlightthickness=1,
                               highlightbackground=GLOW, font=("Segoe UI", 10, "bold"), width=32)
        self.miner_menu["menu"].config(bg="#0d0d0d", fg=GLOW, activebackground=GLOW, activeforeground="#000")
        self.miner_menu.pack(side="left", fill="x", expand=True)
        self.bench_sec_var = tk.IntVar(value=self.cfg.get("bench_sec", BENCH_DEFAULT_SEC))
        tk.Label(mrow, text="s/Test:", bg=BG, fg=DIM, font=("Segoe UI", 8)).pack(side="left", padx=(8, 2))
        bench_entry = tk.Entry(mrow, textvariable=self.bench_sec_var, bg=ENTRY_BG, fg=GLOW,
                               insertbackground=GLOW, relief="flat", highlightthickness=1,
                               highlightbackground=BORDER, highlightcolor=GLOW,
                               font=("Consolas", 9), width=5)
        bench_entry.pack(side="left")
        glow_button(mrow, "⚡ Besten testen", self.benchmark_best).pack(side="left", padx=(6, 0))
        self.miner_info_var = tk.StringVar()
        tk.Label(root, textvariable=self.miner_info_var, bg=BG, fg=DIM,
                 font=("Segoe UI", 8), wraplength=640, justify="left").pack(anchor="w")
        # BzMiner Pfad (legacy, automatisch verwaltet)
        glow_label(root, "MINER-PFAD (auto)", size=9, bold=True, dim=True).pack(anchor="w", pady=(6, 0))
        row = tk.Frame(root, bg=BG)
        row.pack(fill="x", pady=4)
        self.bz_path_var = tk.StringVar(value=self.cfg.get("bzminer", str(DEFAULT_BZMINER)))
        self.bz_entry = dark_entry(row, self.bz_path_var)
        self.bz_entry.pack(side="left", fill="x", expand=True)
        glow_button(row, "…", self.browse_bz).pack(side="left", padx=(6, 2))
        glow_button(row, "Alle laden", self.download_all_miners).pack(side="left", padx=2)

        # Coin
        glow_label(root, "COIN / MODELL", size=9, bold=True, dim=True).pack(anchor="w", pady=(10, 0))
        self.coin_var = tk.StringVar(value=self.cfg.get("coin", list(COINS.keys())[0]))
        if self.coin_var.get() not in COINS:
            self.coin_var.set(list(COINS.keys())[0])
        self.coin_menu = tk.OptionMenu(root, self.coin_var, *list(COINS.keys()), command=lambda _: self.on_coin_change())
        self.coin_menu.config(bg=ENTRY_BG, fg=GLOW, activebackground="#1c1c1c",
                              activeforeground=GLOW, relief="flat", highlightthickness=1,
                              highlightbackground=GLOW, font=("Segoe UI", 10, "bold"))
        self.coin_menu["menu"].config(bg="#0d0d0d", fg=GLOW, activebackground=GLOW, activeforeground="#000")
        self.coin_menu.pack(fill="x", pady=4)
        self.hint_var = tk.StringVar()
        tk.Label(root, textvariable=self.hint_var, bg=BG, fg=DIM,
                 font=("Segoe UI", 8), wraplength=640, justify="left").pack(anchor="w")

        # Wallets - alle 3 direkt im UI eingebbar
        glow_label(root, "WALLET-ADRESSEN  (direkt hier eintippen, wird gespeichert)", size=9, bold=True, dim=True).pack(anchor="w", pady=(10, 0))
        wallets_cfg = self.cfg.get("wallets", {})
        self.wallet_vars = {}
        self.wallet_entries = {}
        for cname in list(COINS.keys()):
            short = COINS[cname]["algo"].upper()
            r = tk.Frame(root, bg=BG)
            r.pack(fill="x", pady=2)
            tk.Label(r, text=short, bg=BG, fg=GLOW, font=("Consolas", 9, "bold"), width=6).pack(side="left")
            var = tk.StringVar(value=wallets_cfg.get(cname, ""))
            e = dark_entry(r, var)
            e.pack(side="left", fill="x", expand=True, padx=(6, 4))
            # Einfügen-Button für schnelles Paste
            b = glow_button(r, "Paste", lambda v=var, ent=None: self._paste_into(v))
            b.config(padx=8, pady=4, font=("Segoe UI", 8, "bold"))
            b.pack(side="right")
            e.bind("<KeyRelease>", lambda _e, cn=cname: self._on_wallet_edit(cn))
            e.bind("<FocusOut>", lambda _e: self.persist())
            self.wallet_vars[cname] = var
            self.wallet_entries[cname] = e
        # aktive Wallet-Anzeige (welche wird benutzt)
        self.active_wallet_var = tk.StringVar()
        tk.Label(root, textvariable=self.active_wallet_var, bg=BG, fg=DIM,
                 font=("Segoe UI", 8), wraplength=640, justify="left").pack(anchor="w")

        # Pool + Worker (für aktiven Coin, frei eingebbar)
        pw = tk.Frame(root, bg=BG)
        pw.pack(fill="x", pady=2)
        left = tk.Frame(pw, bg=BG)
        left.pack(side="left", fill="x", expand=True)
        glow_label(left, "POOL", size=9, bold=True, dim=True).pack(anchor="w")
        self.pool_var = tk.StringVar()
        self.pool_entry = dark_entry(left, self.pool_var)
        self.pool_entry.pack(fill="x", pady=4)
        self.pool_entry.bind("<KeyRelease>", lambda _: self.refresh_cmd())
        right = tk.Frame(pw, bg=BG)
        right.pack(side="left", padx=(10, 0))
        glow_label(right, "WORKER", size=9, bold=True, dim=True).pack(anchor="w")
        self.worker_var = tk.StringVar(value=self.cfg.get("worker", "7900XTX"))
        we = dark_entry(right, self.worker_var, width=14)
        we.pack(pady=4)
        we.bind("<KeyRelease>", lambda _: self.refresh_cmd())

        # Leistung
        glow_label(root, "LEISTUNG  (nur Intensity, kein OC / UV)", size=9, bold=True, dim=True).pack(anchor="w", pady=(10, 0))
        srow = tk.Frame(root, bg=BG)
        srow.pack(fill="x")
        self.power_var = tk.IntVar(value=self.cfg.get("power_pct", 80))
        self.slider = tk.Scale(srow, from_=10, to=100, orient="horizontal",
                               variable=self.power_var, bg=BG, fg=GLOW,
                               troughcolor="#161616", highlightthickness=0,
                               activebackground=GLOW, bd=0, length=400,
                               font=("Segoe UI", 9), command=lambda _: self.on_power())
        self.slider.pack(side="left", fill="x", expand=True)
        self.power_label_var = tk.StringVar()
        tk.Label(srow, textvariable=self.power_label_var, bg=BG, fg=GLOW,
                 font=("Consolas", 10, "bold"), width=26).pack(side="right")
        tk.Label(root, text="10% leise/kühl  •  100% volle Leistung (auto)",
                 bg=BG, fg=DIM, font=("Segoe UI", 8)).pack(anchor="w")

        # Exchange (direkt zu BTC / Stable, Anteil-Slider)
        glow_label(root, "DIREKT-EXCHANGE  (Mini-Coin → BTC / Stable)", size=9, bold=True, dim=True).pack(anchor="w", pady=(10, 0))
        ex_top = tk.Frame(root, bg=BG)
        ex_top.pack(fill="x", pady=2)
        self.ex_enabled_var = tk.BooleanVar(value=self.cfg.get("ex_enabled", False))
        self.ex_check = tk.Checkbutton(ex_top, text="Exchange aktiv", variable=self.ex_enabled_var,
                                       bg=BG, fg=GLOW, selectcolor="#111111",
                                       activebackground=BG, activeforeground=GLOW,
                                       font=("Segoe UI", 9, "bold"), command=self._on_ex_change)
        self.ex_check.pack(side="left")
        tk.Label(ex_top, text="Ziel:", bg=BG, fg=DIM, font=("Segoe UI", 9)).pack(side="left", padx=(12, 2))
        self.ex_target_var = tk.StringVar(value=self.cfg.get("ex_target", "BTC"))
        self.ex_target_menu = tk.OptionMenu(ex_top, self.ex_target_var, "BTC", "USDT", "LTC", "ETH",
                                            command=lambda _: self._on_ex_change())
        self.ex_target_menu.config(bg=ENTRY_BG, fg=GLOW, relief="flat", highlightthickness=1,
                                   highlightbackground=GLOW, font=("Segoe UI", 9, "bold"))
        self.ex_target_menu["menu"].config(bg="#0d0d0d", fg=GLOW, activebackground=GLOW, activeforeground="#000")
        self.ex_target_menu.pack(side="left")
        self.ex_pct_var = tk.IntVar(value=self.cfg.get("ex_pct", 100))
        tk.Label(ex_top, text="Anteil:", bg=BG, fg=DIM, font=("Segoe UI", 9)).pack(side="left", padx=(12, 2))
        self.ex_slider = tk.Scale(ex_top, from_=0, to=100, orient="horizontal",
                                 variable=self.ex_pct_var, bg=BG, fg=GLOW,
                                 troughcolor="#161616", highlightthickness=0,
                                 activebackground=GLOW, bd=0, length=150,
                                 font=("Segoe UI", 9), command=lambda _: self._on_ex_change())
        self.ex_slider.pack(side="left")
        self.ex_pct_label_var = tk.StringVar()
        tk.Label(ex_top, textvariable=self.ex_pct_label_var, bg=BG, fg=GLOW,
                 font=("Consolas", 9, "bold"), width=6).pack(side="left", padx=4)

        ex_addr_row = tk.Frame(root, bg=BG)
        ex_addr_row.pack(fill="x", pady=2)
        tk.Label(ex_addr_row, text="Exchange-Deposit:", bg=BG, fg=DIM,
                 font=("Segoe UI", 8), width=16).pack(side="left")
        self.ex_address_var = tk.StringVar(value=self.cfg.get("ex_address", ""))
        self.ex_address_entry = dark_entry(ex_addr_row, self.ex_address_var)
        self.ex_address_entry.pack(side="left", fill="x", expand=True, padx=(4, 4))
        self.ex_address_entry.bind("<KeyRelease>", lambda _: self._on_ex_change())
        glow_button(ex_addr_row, "Paste", lambda: self._paste_into(self.ex_address_var)).pack(side="right")
        self.ex_info_var = tk.StringVar()
        tk.Label(root, textvariable=self.ex_info_var, bg=BG, fg=DIM,
                 font=("Segoe UI", 8), wraplength=640, justify="left").pack(anchor="w")
        ex_btns = tk.Frame(root, bg=BG)
        ex_btns.pack(fill="x", pady=4)
        glow_button(ex_btns, "⇄ Exchange-Seite öffnen", self.open_exchange).pack(side="left", padx=(0, 6))
        glow_button(ex_btns, "Pool-Dashboard", self.open_pool_dashboard).pack(side="left")

        # Coin-Suche + Estimates (WhatToMine live, 7900-XTX-Hashrates × Leistung)
        glow_label(root, "COIN-SUCHE  (Ertrag / Exchange / Volumen)", size=9, bold=True, dim=True).pack(anchor="w", pady=(10, 0))
        srow2 = tk.Frame(root, bg=BG)
        srow2.pack(fill="x", pady=2)
        self.search_var = tk.StringVar()
        self.search_entry = dark_entry(srow2, self.search_var)
        self.search_entry.pack(side="left", fill="x", expand=True)
        self.search_entry.bind("<KeyRelease>", lambda _: self._on_search())
        glow_button(srow2, "↻ Aktualisieren", self.refresh_estimates).pack(side="left", padx=(6, 0))
        self.est_status_var = tk.StringVar(value="Noch keine Daten – „Aktualisieren“ drücken.")
        tk.Label(root, textvariable=self.est_status_var, bg=BG, fg=DIM,
                 font=("Segoe UI", 8)).pack(anchor="w")
        from tkinter import ttk as _ttk
        _style = _ttk.Style(self)
        try:
            _style.theme_use("clam")
        except Exception:
            pass
        _style.configure("Est.Treeview", background="#050505", foreground="#f0f0f0",
                         fieldbackground="#050505", rowheight=20, font=("Consolas", 8))
        _style.configure("Est.Treeview.Heading", background="#111111", foreground="#ffffff",
                         font=("Segoe UI", 8, "bold"))
        _style.map("Est.Treeview", background=[("selected", "#333333")],
                   foreground=[("selected", "#ffffff")])
        cols = ("coin", "algo", "perday", "usd", "vol", "exchange", "note")
        self.est_tree = _ttk.Treeview(root, columns=cols, show="headings", height=7, style="Est.Treeview")
        widths = {"coin": 90, "algo": 90, "perday": 100, "usd": 80, "vol": 90, "exchange": 150, "note": 130}
        heads = {"coin": "Coin", "algo": "Algo", "perday": "Coins/Tag*", "usd": "$/Tag*",
                 "vol": "Vol/Tag", "exchange": "Exchange", "note": "Hinweis"}
        for c in cols:
            self.est_tree.heading(c, text=heads[c])
            self.est_tree.column(c, width=widths[c], anchor="w")
        self.est_tree.pack(fill="x", pady=4)
        self.est_tree.bind("<Double-1>", self._on_est_select)
        tk.Label(root, text="*ca.-Schätzung: 7900-XTX-Hashrate × Leistungs-Regler. Doppelklick auf XNA/DNX übernimmt ihn als Mining-Coin.",
                 bg=BG, fg=DIM, font=("Segoe UI", 8), wraplength=640, justify="left").pack(anchor="w")
        self.est_data = []  # Liste von Dicts der letzten Schätzung

        # Buttons
        crow = tk.Frame(root, bg=BG)
        crow.pack(fill="x", pady=12)
        self.start_btn = glow_button(crow, "▶  START MINING", self.start_mining, accent=True)
        self.start_btn.pack(side="left", padx=(0, 8))
        self.stop_btn = glow_button(crow, "■  STOP", self.stop_mining)
        self.stop_btn.pack(side="left")
        self.status_var = tk.StringVar(value="○ bereit")
        tk.Label(crow, textvariable=self.status_var, bg=BG, fg=GLOW,
                 font=("Segoe UI", 9, "bold")).pack(side="left", padx=14)
        self._divider(root)

        # Log
        glow_label(root, "MINER-LOG", size=9, bold=True, dim=True).pack(anchor="w")
        self.log_text = tk.Text(root, height=11, wrap="word", bg="#050505", fg="#f0f0f0",
                                insertbackground=GLOW, relief="flat",
                                highlightthickness=1, highlightbackground=BORDER,
                                font=("Consolas", 8))
        self.log_text.pack(fill="both", expand=True, pady=4)

        self.on_coin_change()
        self.on_power()
        self._on_ex_change()
        self.after(200, self.pump_log)

    def _divider(self, parent):
        c = tk.Canvas(parent, height=2, bg=BG, highlightthickness=0)
        c.pack(fill="x", pady=6)
        def draw(_e=None):
            c.delete("all")
            w = c.winfo_width() or 640
            c.create_line(0, 1, w, 1, fill="#222222")
            c.create_line(0, 1, w // 3, 1, fill="#ffffff", width=2)
        c.bind("<Configure>", draw)
        draw()

    # ---------- Logik ----------
    def _paste_into(self, var):
        try:
            clip = self.clipboard_get().strip()
        except Exception:
            clip = ""
        if clip:
            var.set(clip)
            self._on_wallet_edit("")
        self.persist()

    def _on_wallet_edit(self, coin_name):
        # sofort speichern + aktive Anzeige aktualisieren
        self.persist()
        self._update_active_wallet()

    def _update_active_wallet(self):
        try:
            active = self.coin_var.get()
            w = self.wallet_vars.get(active, None)
            wv = w.get().strip() if w else ""
            if wv:
                self.active_wallet_var.set(f"aktiv für {active.split('(')[0].strip()}: {wv[:18]}…{wv[-6:]} ({len(wv)} Zeichen)")
            else:
                self.active_wallet_var.set(f"aktiv für {active.split('(')[0].strip()}: NOCH KEINE ADRESSE EINGETRAGEN")
        except Exception:
            pass

    def on_coin_change(self, *_):
        coin = COINS[self.coin_var.get()]
        self.hint_var.set("◆ " + coin["hint"])
        pools = self.cfg.get("pools", {})
        # Pool: gespeicherten pro Coin laden, sonst Default. Pool ist frei eingebbar.
        saved_pool = pools.get(self.coin_var.get())
        if saved_pool:
            self.pool_var.set(saved_pool)
        else:
            # nur setzen wenn leer oder anderer Coin-Default sinnvoll
            if not self.pool_var.get().strip():
                self.pool_var.set(coin["default_pool"])
        self._update_active_wallet()
        try:
            self._on_miner_change()
        except Exception:
            pass
        self.on_power()

    def on_power(self, *_a):
        pct = int(self.power_var.get())
        intensity = self.power_to_intensity(pct)
        if pct >= 100:
            self.power_label_var.set(f"{pct}%  →  auto (max)")
        else:
            self.power_label_var.set(f"{pct}%  →  -i {intensity}")
        # Estimates auf neue Leistung umskalieren
        try:
            old = getattr(self, "est_scale", None)
            if old and self.est_data and old != pct / 100.0:
                f = (pct / 100.0) / old
                for r in self.est_data:
                    if r["perday"] is not None:
                        r["perday"] *= f
                    if r["usd"] is not None:
                        r["usd"] *= f
                self.est_scale = pct / 100.0
                self._render_estimates()
        except Exception:
            pass
        self.refresh_cmd()

    @staticmethod
    def power_to_intensity(pct: int) -> int:
        if pct >= 100:
            return 0
        return max(6, min(64, round(pct * 64 / 100)))

    def refresh_cmd(self):
        pass  # Kommando wird beim Start gebaut; kein separates Feld nötig

    # ---------- Multi-Miner ----------
    def selected_miner_key(self):
        label = self.miner_var.get()
        for k in self.miner_keys:
            if MINERS[k]["label"] == label:
                return k
        return "bzminer"

    def _on_miner_change(self):
        key = self.selected_miner_key()
        # Pfad automatisch auf den Miner zeigen
        exe = str(APP_DIR / MINERS[key]["exe_rel"])
        self.bz_path_var.set(exe)
        self.miner_info_var.set("◆ " + MINERS[key]["note"] + self._compat_hint(key))
        self.persist()

    def _compat_hint(self, key):
        algo = COINS[self.coin_var.get()]["algo"]
        if algo in MINERS[key]["supports"]:
            return ""
        return f"  ⚠ {MINERS[key]['label']} kann {algo.upper()} NICHT – bitte wechseln oder Benchmark nutzen."

    def miner_exe(self, key):
        return APP_DIR / MINERS[key]["exe_rel"]

    def compatible_miners(self, algo):
        return [k for k in MINERS if algo in MINERS[k]["supports"]]

    def build_cmd(self, wallet_override=None, miner_key=None):
        key = miner_key or self.selected_miner_key()
        exe = str(self.miner_exe(key))
        coin_name = self.coin_var.get()
        coin = COINS[coin_name]
        wallet = (wallet_override.strip() if wallet_override else self.wallet_vars[coin_name].get().strip())
        if not wallet:
            raise ValueError(f"Bitte {coin['algo'].upper()}-Wallet-Adresse oben im UI eintragen.")
        pool = self.pool_var.get().strip() or coin["default_pool"]
        # Pool-URL ohne Protokoll für Miner die es so wollen (TRM/SRBM)
        pool_noproto = pool.replace("stratum+tcp://", "").replace("stratum+ssl://", "")
        worker = self.worker_var.get().strip() or "7900XTX"
        intensity = self.power_to_intensity(int(self.power_var.get()))
        algo = coin["algo"]
        malgo = MINER_ALGO.get(key, {}).get(algo)
        if not malgo:
            raise ValueError(f"{MINERS[key]['label']} unterstützt {algo.upper()} nicht.")
        if key == "bzminer":
            if algo == "dynex":
                cmd = [exe, "-a", "dynex", "-p", pool, "-w", wallet,
                       "--pool_password", worker, "--nc", "1"]
            else:
                cmd = [exe, "-a", malgo, "-w", f"{wallet}.{worker}", "-p", pool]
            if intensity != 0:
                cmd += ["--i1", str(intensity)]
            cmd += coin.get("extra_args", [])
            return cmd
        if key == "teamredminer":
            # TRM: -a kawpow -o pool -u WALLET.WORKER -p x
            return [exe, "-a", malgo, "-o", pool_noproto,
                    "-u", f"{wallet}.{worker}", "-p", "x", "--watchdog_script=false"]
        if key == "srbminer":
            # SRBM: --algorithm --pool --wallet --worker --password
            base = [exe, "--algorithm", malgo, "--pool", pool_noproto,
                    "--wallet", wallet, "--worker", worker, "--password", "x"]
            if intensity != 0:
                base += ["--intensity", str(intensity)]
            return base
        if key == "wildrig":
            # WildRig: --algo --url --user --pass
            return [exe, "--algo", malgo, "--url", pool_noproto,
                    "--user", f"{wallet}.{worker}", "--pass", "x", "--opencl-threads", "auto"]
        if key == "onezerominer":
            # OneZero: Dynex/Xelis Syntax
            if algo == "dynex":
                return [exe, "--dynex", "-w", wallet, "-o", pool_noproto, "-r", worker]
            return [exe, "--xelis", "-w", wallet, "-o", pool_noproto, "-r", worker]
        raise ValueError(f"Unbekannter Miner {key}")

    # ---------- Exchange ----------
    def _on_ex_change(self, *_a):
        try:
            pct = int(self.ex_pct_var.get())
        except Exception:
            pct = 100
        enabled = bool(self.ex_enabled_var.get())
        try:
            self.ex_pct_label_var.set(f"{pct}%")
        except Exception:
            pass
        target = self.ex_target_var.get()
        if not enabled or pct <= 0:
            info = "Exchange aus – alles bleibt auf deiner Wallet."
        elif pct >= 100:
            info = f"100% → alles wird direkt auf deine Exchange-Deposit ({target}) gemined."
        else:
            info = (f"{pct}% → Zeit-Split pro 60 Min: {pct} Min Exchange ({target}), "
                    f"{100-pct} Min eigene Wallet. Auto-Wechsel im Log.")
        try:
            self.ex_info_var.set("◆ " + info)
        except Exception:
            pass
        self.persist()

    def _ex_addrs(self):
        """(own_wallet, ex_wallet, use_exchange)"""
        coin_name = self.coin_var.get()
        own = self.wallet_vars[coin_name].get().strip()
        ex = self.ex_address_var.get().strip()
        enabled = bool(self.ex_enabled_var.get())
        try:
            pct = int(self.ex_pct_var.get())
        except Exception:
            pct = 0
        return own, ex, enabled, pct

    def open_exchange(self):
        coin_name = self.coin_var.get()
        algo = COINS[coin_name]["algo"]
        # passende Börse je Coin
        if algo == "dynex":
            url = "https://nonkyc.io/market/DNX_USDT"
        elif algo == "xna":
            url = "https://www.mexc.com/exchange/XNA_USDT"
        else:
            url = "https://www.mexc.com/exchange/CLORE_USDT"
        try:
            webbrowser.open(url)
        except Exception:
            pass
        own, ex, enabled, pct = self._ex_addrs()
        target = self.ex_target_var.get()
        self.log_q.put(f"» Exchange-Seite: {url}\n» Coin {algo.upper()} → {target}, Anteil {pct if enabled else 0}%\n")
        if ex:
            try:
                self.clipboard_clear()
                self.clipboard_append(ex)
                self.log_q.put("» Exchange-Deposit in Zwischenablage kopiert.\n")
            except Exception:
                pass
        else:
            self.log_q.put("» Tipp: Exchange-Deposit-Adresse oben eintragen (von MEXC/NonKYC kopieren).\n")

    def open_pool_dashboard(self):
        pool = self.pool_var.get().strip()
        if "woolypooly" in pool:
            url = "https://woolypooly.com/"
        elif "kryptex" in pool:
            url = "https://pool.kryptex.com/"
        elif "2miners" in pool:
            url = "https://2miners.com/"
        else:
            url = "https://woolypooly.com/"
        try:
            webbrowser.open(url)
        except Exception:
            pass
        self.log_q.put(f"» Pool-Dashboard: {url}\n» Dort Wallet suchen + ggf. Auto-Exchange zu BTC/USDT aktivieren.\n")

    # ---------- Coin-Suche / Estimates ----------
    def refresh_estimates(self):
        self.est_status_var.set("Lade WhatToMine-Daten …")
        threading.Thread(target=self._estimates_thread, daemon=True).start()

    def _btc_usd(self):
        try:
            req = urllib.request.Request(
                "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
                headers={"User-Agent": "xtx-miner"})
            import ssl
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, context=ctx, timeout=15) as r:
                return float(json.loads(r.read().decode())["bitcoin"]["usd"])
        except Exception:
            return 84000.0

    def _estimates_thread(self):
        import ssl
        try:
            pct = int(self.power_var.get())
        except Exception:
            pct = 100
        scale = pct / 100.0
        try:
            ctx = ssl.create_default_context()
            req = urllib.request.Request("https://whattomine.com/coins.json",
                                         headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, context=ctx, timeout=30) as r:
                coins = json.loads(r.read().decode()).get("coins", {})
        except Exception as e:
            self.log_q.put(f"» Estimates: WhatToMine nicht erreichbar ({e}) – Offline-Kurztabelle.\n")
            self._estimates_fallback(scale)
            return
        btc = self._btc_usd()
        rows = []
        for name, c in coins.items():
            tag = str(c.get("tag", ""))
            if tag not in EST_TAGS:
                continue
            algo = str(c.get("algorithm", ""))
            base_hs = EST_HASHRATE.get(algo)
            if not base_hs:
                continue
            try:
                nethash = float(c.get("nethash") or 0)
                btime = float(c.get("block_time") or 0)
                reward = float(c.get("block_reward") or 0)
                rate_btc = float(c.get("exchange_rate") or 0)
                vol_btc = float(c.get("exchange_rate_vol") or 0)
            except Exception:
                continue
            if nethash <= 0 or btime <= 0:
                continue
            user_hs = base_hs * scale
            perday = user_hs / nethash * (86400.0 / btime) * reward
            usd = perday * rate_btc * btc
            vol = vol_btc * btc
            venue, liq = EXCHANGES.get(tag, ("–", ""))
            note = "★ minebar" if tag in MINEABLE_TAGS else ""
            if vol < 15000:
                note = (note + " dünn!").strip()
            rows.append({"coin": f"{tag} ({name[:18]})", "tag": tag, "algo": algo,
                         "perday": perday, "usd": usd, "vol": vol,
                         "exchange": venue, "note": note or "nur Schätzung"})
        # CLORE ist nicht auf WTM → kuratierte Info-Zeile
        rows.append({"coin": "CLORE (Clore.ai)", "tag": "CLORE", "algo": "KawPow",
                     "perday": None, "usd": None, "vol": None,
                     "exchange": EXCHANGES["CLORE"][0], "note": "★ minebar, nicht auf WTM"})
        rows.sort(key=lambda r: (r["usd"] is None, -(r["usd"] or 0)))
        self.est_data = rows
        self.est_scale = scale
        self.est_status_var.set(f"WhatToMine live • BTC ${btc:,.0f} • Leistung {pct}% berücksichtigt")
        self._render_estimates()
        self.log_q.put(f"» Estimates aktualisiert ({len(rows)} Coins, BTC ${btc:,.0f}).\n")

    def _estimates_fallback(self, scale):
        # Offline: grobe, als solche markierte Werte
        fb = [
            {"coin": "XNA (Neurai)", "tag": "XNA", "algo": "KawPow",
             "perday": 5400 * scale, "usd": 0.25 * scale, "vol": 30000.0,
             "exchange": EXCHANGES["XNA"][0], "note": "★ minebar (offline)"},
            {"coin": "DNX (Dynexcoin)", "tag": "DNX", "algo": "DynexSolve",
             "perday": 4.0 * scale, "usd": 0.01 * scale, "vol": 3000.0,
             "exchange": EXCHANGES["DNX"][0], "note": "★ minebar, dünn! (offline)"},
            {"coin": "CLORE (Clore.ai)", "tag": "CLORE", "algo": "KawPow",
             "perday": None, "usd": None, "vol": None,
             "exchange": EXCHANGES["CLORE"][0], "note": "★ minebar (offline)"},
        ]
        self.est_data = fb
        self.est_scale = scale
        self.est_status_var.set("Offline-Schätzung (WhatToMine nicht erreichbar).")
        self._render_estimates()

    def _render_estimates(self):
        try:
            q = self.search_var.get().strip().lower()
        except Exception:
            q = ""
        try:
            for i in self.est_tree.get_children():
                self.est_tree.delete(i)
        except Exception:
            return
        for r in self.est_data:
            hay = (r["coin"] + " " + r["algo"] + " " + r["tag"]).lower()
            if q and q not in hay:
                continue
            pd = f"{r['perday']:,.0f}" if r["perday"] is not None else "–"
            us = f"${r['usd']:,.2f}" if r["usd"] is not None else "–"
            vo = f"${r['vol']:,.0f}" if r["vol"] is not None else "–"
            self.est_tree.insert("", "end", values=(r["coin"], r["algo"], pd, us, vo, r["exchange"], r["note"]))

    def _on_search(self):
        self._render_estimates()

    def _on_est_select(self, _evt=None):
        try:
            sel = self.est_tree.selection()
            if not sel:
                return
            vals = self.est_tree.item(sel[0], "values")
        except Exception:
            return
        if not vals:
            return
        # Tag aus erster Spalte holen ("XNA (Neurai)" → XNA)
        tag = vals[0].split()[0]
        if tag == "XNA":
            self.coin_var.set([k for k in COINS if "XNA" in k][0])
            self.on_coin_change()
            self.log_q.put("» XNA aus Suche als Mining-Coin übernommen.\n")
        elif tag == "DNX":
            self.coin_var.set([k for k in COINS if "DNX" in k][0])
            self.on_coin_change()
            self.log_q.put("» DNX aus Suche als Mining-Coin übernommen.\n")
        elif tag == "CLORE":
            self.coin_var.set([k for k in COINS if "CLORE" in k][0])
            self.on_coin_change()
            self.log_q.put("» CLORE als Mining-Coin übernommen.\n")
        else:
            self.log_q.put(f"» {tag}: nur Schätzung – minebar sind XNA / CLORE / DNX.\n")

    def browse_bz(self):
        p = filedialog.askopenfilename(title="miner .exe wählen",
                                       filetypes=[("EXE", "*.exe"), ("Alle", "*.*")])
        if p:
            self.bz_path_var.set(p)

    def download_bz(self):
        threading.Thread(target=self._auto_download, args=(self.selected_miner_key(),), daemon=True).start()

    def download_all_miners(self):
        threading.Thread(target=self._download_all_thread, daemon=True).start()

    def _download_all_thread(self):
        algo = COINS[self.coin_var.get()]["algo"]
        for k in self.compatible_miners(algo):
            self._auto_download_sync(k)
        self.log_q.put("» alle kompatiblen Miner geladen.\n")

    def _auto_download_sync(self, key):
        import ssl
        try:
            repo = MINERS[key]["repo"]
            self.log_q.put(f"» [{key}] suche Release {repo} …\n")
            ctx = ssl.create_default_context()
            req = urllib.request.Request(
                f"https://api.github.com/repos/{repo}/releases/latest",
                headers={"User-Agent": "xtx-miner"})
            with urllib.request.urlopen(req, context=ctx, timeout=30) as r:
                data = json.loads(r.read().decode())
            url = None
            for a in data.get("assets", []):
                name = a.get("name", "").lower()
                if name.endswith(".zip") and ("window" in name or "win" in name):
                    # TRM hat mehrere Zips (win64) – nimm win64
                    if key == "teamredminer" and "win64" not in name:
                        continue
                    url = a.get("browser_download_url")
                    break
            if not url:  # Fallback: erstes zip
                for a in data.get("assets", []):
                    if a.get("name", "").lower().endswith(".zip"):
                        url = a.get("browser_download_url")
                        break
            if not url:
                self.log_q.put(f"» [{key}] kein ZIP gefunden.\n")
                return False
            dest_dir = APP_DIR / key
            dest_dir.mkdir(exist_ok=True)
            zpath = dest_dir / f"{key}_win.zip"
            self.log_q.put(f"» [{key}] lade …\n")
            urllib.request.urlretrieve(url, zpath)
            with zipfile.ZipFile(zpath, "r") as z:
                z.extractall(dest_dir)
            # exe finden
            want = Path(MINERS[key]["exe_rel"]).name.lower()
            found = None
            for p in dest_dir.rglob("*.exe"):
                if p.name.lower() == want:
                    found = p
                    break
            if not found:
                exes = list(dest_dir.rglob("*.exe"))
                found = exes[0] if exes else None
            if found:
                self.log_q.put(f"» [{key}] fertig: {found}\n")
                if key == self.selected_miner_key():
                    self.bz_path_var.set(str(found))
                return True
            self.log_q.put(f"» [{key}] entpackt, aber keine .exe gefunden.\n")
            return False
        except Exception as e:
            self.log_q.put(f"» [{key}] download-fehler: {e}\n")
            return False

    def _auto_download(self, key=None):
        self._auto_download_sync(key or self.selected_miner_key())

    # ---------- Benchmark: alle kompatiblen testen, besten wählen ----------
    def benchmark_best(self):
        if self.proc and self.proc.poll() is None:
            messagebox.showinfo("Stopp", "Bitte erst Stop drücken, dann Benchmark.")
            return
        try:
            sec = int(self.bench_sec_var.get())
        except Exception:
            sec = BENCH_DEFAULT_SEC
        sec = max(20, min(300, sec))
        threading.Thread(target=self._benchmark_thread, args=(sec,), daemon=True).start()

    def _parse_hashrate_hs(self, text):
        import re
        best = 0.0
        # z.B. 58.4 MH/s, 2.5 kH/s, 1.2 GH/s, 850 H/s
        for m in re.finditer(r"(\d+(?:[.,]\d+)?)\s*(GH/s|MH/s|kH/s|KH/s|H/s|GH|S|MH|S)", text, re.IGNORECASE):
            try:
                val = float(m.group(1).replace(",", "."))
            except Exception:
                continue
            unit = m.group(2).upper()
            mult = 1.0
            if unit.startswith("GH"):
                mult = 1e9
            elif unit.startswith("MH"):
                mult = 1e6
            elif unit.startswith("KH") or unit.startswith("KH"):
                mult = 1e3
            best = max(best, val * mult)
        return best

    def _benchmark_one(self, key, wallet, sec):
        import time
        try:
            cmd = self.build_cmd(wallet_override=wallet, miner_key=key)
        except Exception as e:
            return 0.0, f"skip: {e}"
        exe = Path(cmd[0])
        if not exe.exists():
            ok = self._auto_download_sync(key)
            if not ok or not exe.exists():
                # nach Download erneut auflösen (exe kann in Unterordner liegen)
                found = None
                for p in (APP_DIR / key).rglob("*.exe"):
                    found = p
                    break
                if found:
                    cmd[0] = str(found)
                    exe = found
                else:
                    return 0.0, "exe fehlt"
        try:
            p = subprocess.Popen(cmd, cwd=str(exe.parent),
                                 stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                 text=True, bufsize=1)
        except Exception as e:
            return 0.0, f"start-fehler: {e}"
        out = []
        start = time.time()
        peak = 0.0
        try:
            while time.time() - start < sec:
                line = p.stdout.readline()
                if not line:
                    if p.poll() is not None:
                        break
                    continue
                out.append(line)
                if len(out) > 200:
                    out.pop(0)
                peak = max(peak, self._parse_hashrate_hs(line))
            # Durchschnitt der letzten Ausgabe als Score
            tail = "".join(out[-60:])
            score = self._parse_hashrate_hs(tail) or peak
        finally:
            try:
                p.terminate()
                try:
                    p.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    p.kill()
            except Exception:
                pass
        return score, f"{score:,.0f} H/s"

    def _benchmark_thread(self, sec):
        coin_name = self.coin_var.get()
        algo = COINS[coin_name]["algo"]
        wallet = self.wallet_vars[coin_name].get().strip()
        if not wallet:
            self.log_q.put("» Benchmark: bitte erst Wallet-Adresse eintragen.\n")
            return
        cands = self.compatible_miners(algo)
        self.log_q.put(f"» Benchmark startet: {algo.upper()} mit {', '.join(cands)} je {sec}s …\n")
        self.status_var.set("● benchmark läuft …")
        results = {}
        for k in cands:
            self.log_q.put(f"» teste {MINERS[k]['label']} …\n")
            score, txt = self._benchmark_one(k, wallet, sec)
            results[k] = score
            self.log_q.put(f"   → {k}: {txt}\n")
        if not results or max(results.values()) <= 0:
            self.log_q.put("» Benchmark: keine Hashrate gemessen (Pool/Wallet prüfen).\n")
            self.status_var.set("○ bereit")
            return
        best = max(results, key=results.get)
        self.log_q.put(f"» ★ Gewinner: {MINERS[best]['label']} ({results[best]:,.0f} H/s)\n")
        # automatisch wählen
        self.miner_var.set(MINERS[best]["label"])
        self._on_miner_change()
        self.persist()
        self.status_var.set("○ bereit")
        try:
            messagebox.showinfo("Benchmark", f"Bester Miner: {MINERS[best]['label']}\n{results[best]:,.0f} H/s\nWurde automatisch ausgewählt.")
        except Exception:
            pass

    def persist(self):
        wallets = {}
        for cname, var in getattr(self, "wallet_vars", {}).items():
            try:
                wallets[cname] = var.get().strip()
            except Exception:
                pass
        # alte Werte erhalten
        old = self.cfg.get("wallets", {})
        old.update(wallets)
        pools = self.cfg.get("pools", {})
        try:
            pools[self.coin_var.get()] = self.pool_var.get().strip()
        except Exception:
            pass
        self.cfg.update({
            "bzminer": self.bz_path_var.get().strip(),
            "coin": self.coin_var.get(),
            "miner": self.selected_miner_key(),
            "bench_sec": int(self.bench_sec_var.get()),
            "worker": self.worker_var.get().strip(),
            "power_pct": int(self.power_var.get()),
            "wallets": old,
            "pools": pools,
            "ex_enabled": bool(self.ex_enabled_var.get()),
            "ex_target": self.ex_target_var.get(),
            "ex_pct": int(self.ex_pct_var.get()),
            "ex_address": self.ex_address_var.get().strip(),
        })
        save_config(self.cfg)

    def _spawn_miner(self, wallet, tag):
        cmd = self.build_cmd(wallet_override=wallet)
        bz = cmd[0]
        self.log_q.put(f"» [{tag}] " + " ".join(cmd) + "\n")
        self.proc = subprocess.Popen(cmd, cwd=str(Path(bz).parent),
                                     stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                     text=True, bufsize=1)
        threading.Thread(target=self._read_output, daemon=True).start()

    def _schedule_ex_switch(self, delay_ms, next_mode):
        if self.ex_timer_id is not None:
            try:
                self.after_cancel(self.ex_timer_id)
            except Exception:
                pass
        self.ex_timer_id = self.after(delay_ms, lambda: self._ex_switch(next_mode))

    def _ex_switch(self, next_mode):
        if not self.proc or self.proc.poll() is not None:
            return  # gestoppt
        own, ex, enabled, pct = self._ex_addrs()
        if not enabled or pct <= 0 or pct >= 100 or not ex or not own:
            return
        self._stop_proc_silent()
        self.ex_mode = next_mode
        if next_mode == "exchange":
            self.log_q.put(f">> Wechsel: jetzt {pct}%‐Anteil → EXCHANGE ({self.ex_target_var.get()})\n")
            self.status_var.set(f"● mining EXCHANGE @ {self.power_var.get()}%")
            self._spawn_miner(ex, "EXCHANGE")
            self._schedule_ex_switch(pct * 60 * 1000, "own")
        else:
            self.log_q.put(f">> Wechsel: jetzt {100-pct}%‐Anteil → EIGENE WALLET\n")
            self.status_var.set(f"● mining: {COINS[self.coin_var.get()]['algo']} @ {self.power_var.get()}%")
            self._spawn_miner(own, "EIGEN")
            self._schedule_ex_switch((100 - pct) * 60 * 1000, "exchange")

    def _stop_proc_silent(self):
        try:
            if self.proc and self.proc.poll() is None:
                self.proc.terminate()
                try:
                    self.proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.proc.kill()
        except Exception:
            pass

    def start_mining(self):
        if self.proc and self.proc.poll() is None:
            messagebox.showinfo("Läuft", "Miner läuft bereits.")
            return
        own, ex, enabled, pct = self._ex_addrs()
        if enabled and pct > 0 and not ex:
            messagebox.showwarning("Fehlt", "Exchange aktiv, aber keine Exchange-Deposit-Adresse eingetragen.")
            return
        if enabled and pct > 0 and pct < 100 and (not own or not ex):
            messagebox.showwarning("Fehlt", "Für Split bitte eigene Wallet UND Exchange-Deposit eintragen.")
            return
        try:
            probe = self.build_cmd(wallet_override=ex if (enabled and pct >= 100 and ex) else None)
        except ValueError as e:
            messagebox.showwarning("Fehlt", str(e))
            return
        bz = probe[0]
        if not Path(bz).exists():
            self.log_text.delete("1.0", "end")
            self.log_q.put(f"» miner nicht gefunden: {bz}\n» starte auto-download …\n")
            self.download_bz()
            messagebox.showwarning("Miner fehlt",
                                   "Miner-EXE nicht gefunden.\nDownload läuft im Log – danach nochmal Start drücken.")
            return
        self.persist()
        self.log_text.delete("1.0", "end")
        mkey = self.selected_miner_key()
        self.log_q.put(f"» Miner: {MINERS[mkey]['label']} – kein OC/UV – nur Intensity.\n")
        try:
            if enabled and 0 < pct < 100:
                # Split-Modus: starte mit eigener Wallet, dann Rotation
                self.ex_mode = "own"
                self.log_q.put(f"» Split aktiv: {100-pct}% eigen / {pct}% Exchange ({self.ex_target_var.get()}) pro 60 Min.\n")
                self._spawn_miner(own, "EIGEN")
                self.status_var.set(f"● mining EIGEN @ {self.power_var.get()}%")
                self._schedule_ex_switch((100 - pct) * 60 * 1000, "exchange")
            elif enabled and pct >= 100:
                self.ex_mode = "exchange"
                self.log_q.put(f"» 100% direkt auf Exchange-Deposit ({self.ex_target_var.get()}).\n")
                self._spawn_miner(ex, "EXCHANGE")
                self.status_var.set(f"● mining EXCHANGE @ {self.power_var.get()}%")
            else:
                self.ex_mode = "own"
                self._spawn_miner(own, "EIGEN")
                self.status_var.set(f"● mining: {COINS[self.coin_var.get()]['algo']} @ {self.power_var.get()}%")
        except Exception as e:
            messagebox.showerror("Start-Fehler", str(e))
            return

    def _read_output(self):
        try:
            for line in self.proc.stdout:
                self.log_q.put(line)
        except Exception as e:
            self.log_q.put(f"[reader-ende: {e}]\n")
        self.log_q.put("[miner beendet]\n")

    def pump_log(self):
        ended = False
        try:
            while True:
                line = self.log_q.get_nowait()
                self.log_text.insert("end", line)
                self.log_text.see("end")
                if "[miner beendet]" in line:
                    ended = True
        except queue.Empty:
            pass
        if ended:
            # bei Split-Rotation kein Reset (Timer läuft weiter)
            rotating = self.ex_timer_id is not None
            running = self.proc is not None and self.proc.poll() is None
            if not rotating and not running:
                self.status_var.set("○ bereit")
        self.after(200, self.pump_log)

    def stop_mining(self):
        if self.ex_timer_id is not None:
            try:
                self.after_cancel(self.ex_timer_id)
            except Exception:
                pass
            self.ex_timer_id = None
        self._stop_proc_silent()
        self.status_var.set("○ bereit")


if __name__ == "__main__":
    app = MinerUI()
    app.mainloop()
