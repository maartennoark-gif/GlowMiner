# GlowMiner — Mini-Miner mit Black-Glowing-White UI (AMD + NVIDIA)

Windows-Tool (React-Frontend + Rust-Backend, Tauri): Wallet eintragen, Coin wählen, Leistung per Regler begrenzen, minen. Kein Overclocking / Undervolting — nur Miner-Intensity.

## Installieren

Setup ausführen: [v3.1.0](https://github.com/maartennoark-gif/GlowMiner/releases/tag/v3.1.0) → `GlowMiner_3.1.0_x64-setup.exe` (installiert nach `%LOCALAPPDATA%\GlowMiner`). Config und Miner liegen stabil unter `%APPDATA%\com.glowminer.app`.

## Entwickeln

```bat
cd glowminer
npm install
npx tauri dev      &:: Dev-Modus (Vite + Rust)
npx tauri build    &:: Release-Setup nach src-tauri\target\release\bundle\nsis
```

## Coins (ein Wallet-Feld für den aktiven Coin)

- **Neurai (XNA)** — AI-IoT, auf MEXC verkaufbar
- **Clore (CLORE)** — AI-Compute, liquide
- **Dynex (DNX)** — AI-PoUW, ultra-leicht (Lotto, nur NonKYC)
- **Xelis (XEL)** — Privacy-BlockDAG (XelisHashV3), MEXC + CoinEx (Miner: OneZeroMiner/SRBMiner/BzMiner)

## Features

- schwarzes UI mit weißem Glow, Tabs: Mining / Coins / Wallets / Log
- ein Wallet-Feld für den aktiven Coin + Paste-Button, gespeichert in `config.json`
- Pool + Worker frei eingebbar (WoolyPooly / 2Miners / MiningOcean / Neuropool)
- Leistungs-Regler 10–100% → Miner-Intensity (kein OC/UV)
- Direkt-Exchange: Ziel BTC/USDT/LTC/ETH, Anteil-Slider 0–100% (100% = direkt auf Exchange-Deposit, dazwischen Zeit-Split pro 60 Min), Buttons für Exchange-Seite + Pool-Dashboard
- Multi-Miner: BzMiner, TeamRedMiner, SRBMiner-Multi, WildRig-Multi, OneZeroMiner — werden beim ersten Start automatisch von GitHub geladen (stabiler Ordner, kein Temp)
- Besten testen: testet alle kompatiblen Miner auf dem gewählten Coin (Standard 60 s, einstellbar) und wählt automatisch den mit der höchsten Hashrate
- Coin-Suche + Estimates: alle WhatToMine-Coins browsen, ca. Coins/Tag und $/Tag (Hashrate × Leistungs-Regler, live), Tages-Volumen, Börse und Hinweis. Klick auf XNA/DNX/CLORE/XEL übernimmt ihn als Mining-Coin
- Wallets: Adressbuch + Wallet-App per WalletConnect (EVM) verbinden
- Defender-Exception-Button: trägt den Miner-Ordner als Antivirus-Ausnahme ein (braucht Admin) — Miner werden sonst gern in Quarantäne verschoben

## Hinweise

- Miner-Binaries (BzMiner etc.) werden **nicht** mit ins Repo gepackt, die App lädt sie beim ersten Start aus den offiziellen GitHub-Releases. Lizenzen der jeweiligen Miner beachten (Dev-Fees je nach Algo).
- `config.json` enthält deine Wallets — nicht teilen, per `.gitignore` ausgeschlossen.
- Mining ist in DE mit Netzstrom (~30–37 ct/kWh) meist unprofitabel. Keine Finanzberatung. Erst Wallet + Pool + Börsen-Listing prüfen (XNA/CLORE auf MEXC, DNX auf NonKYC, Volumen winzig).
