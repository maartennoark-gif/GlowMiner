# GlowMiner — Mini-Miner mit Black-Glowing-White UI (AMD + NVIDIA)

Windows-Tool für AMD RX 7900 XTX **und** NVIDIA-GPUs: Wallet eintragen, AI-Coin wählen, Leistung per Regler begrenzen, minen. Kein Overclocking / Undervolting — nur Miner-Intensity.

Coins:
- **Neurai (XNA)** — AI-IoT, auf MEXC verkaufbar
- **Clore (CLORE)** — AI-Compute, liquide
- **Dynex (DNX)** — AI-PoUW, ultra-leicht (Lotto, nur NonKYC)

Features:
- schwarzes UI mit weißem Glow (eine EXE)
- 3 Wallet-Felder direkt im UI (XNA / CLORE / DNX) + Paste-Button, wird in `config.json` gespeichert
- Pool + Worker frei eingebbar (WoolyPooly / 2Miners / MiningOcean / Neuropool)
- Leistungs-Regler 10–100% → Miner-Intensity (kein OC/UV)
- Direkt-Exchange: Ziel BTC/USDT/LTC/ETH, Anteil-Slider 0–100% (100% = direkt auf Exchange-Deposit, dazwischen Zeit-Split pro 60 Min), Buttons für Exchange-Seite + Pool-Dashboard
- Multi-Miner: BzMiner, TeamRedMiner, SRBMiner-Multi, WildRig-Multi, OneZeroMiner — werden beim ersten Start automatisch von GitHub geladen
- **⚡ Besten testen**: testet alle kompatiblen Miner auf dem gewählten Coin (Standard 60 s, einstellbar) und wählt automatisch den mit der höchsten Hashrate

## Start (Code)

```bat
python miner_ui.py
```

## Build (eine EXE)

```bat
pip install pyinstaller
python -m PyInstaller --onefile --windowed --name XTX-Miner --clean miner_ui.py
```

Fertig: `dist\XTX-Miner.exe` → nach `XTX-Miner.exe` kopieren.

## Hinweise

- Miner-Binaries (BzMiner etc.) werden **nicht** mit ins Repo gepackt, die EXE lädt sie beim ersten Start aus den offiziellen GitHub-Releases nach `.\bzminer\`, `.\teamredminer\` … Lizenzen der jeweiligen Miner beachten (Dev-Fees: BzMiner 1–2%, TRM/SRBM je nach Algo).
- `config.json` enthält deine Wallets — nicht teilen, per `.gitignore` ausgeschlossen.
- Mining ist in DE mit Netzstrom (~30–37 ct/kWh) meist unprofitabel. Keine Finanzberatung. Erst Wallet + Pool + Börsen-Listing prüfen (XNA/CLORE auf MEXC, DNX auf NonKYC, Volumen winzig).
