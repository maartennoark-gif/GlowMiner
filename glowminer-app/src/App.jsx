import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  COINS, DEFAULT_HASHRATE, fetchBtcUsd, fetchWtmCoins,
  estimateAll, fmt,
} from './lib.js';

const api = window.api || null;
const inElectron = !!api;

const EX_TARGETS = ['BTC', 'USDT', 'LTC', 'ETH'];

export default function App() {
  const [tab, setTab] = useState('mining');
  const [cfg, setCfg] = useState({
    coin: 'xna', wallets: {}, pools: {}, worker: 'GlowMiner',
    powerPct: 80, miner: 'bzminer', benchSec: 60,
    hashrates: { ...DEFAULT_HASHRATE },
    exEnabled: false, exTarget: 'BTC', exPct: 100, exAddress: '',
    evmAddress: '', wcProjectId: '',
  });
  const [loaded, setLoaded] = useState(false);
  const [miners, setMiners] = useState([]);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bench, setBench] = useState({ active: false, items: [] });
  const [log, setLog] = useState(['GlowMiner bereit. Schwarzes UI, weißer Glow.']);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [coinsLoading, setCoinsLoading] = useState(false);
  const [coinsMeta, setCoinsMeta] = useState('');
  const [wcUri, setWcUri] = useState('');
  const [wcAccounts, setWcAccounts] = useState([]);
  const [wcBusy, setWcBusy] = useState(false);
  const wtmCache = useRef(null);
  const btcCache = useRef(84000);
  const wcProvider = useRef(null);
  const logRef = useRef(null);

  const pushLog = (line) =>
    setLog((l) => [...l.slice(-499), line.replace(/\n$/, '')]);

  // ---------- Config laden ----------
  useEffect(() => {
    (async () => {
      if (api) {
        try {
          const c = await api.cfgLoad();
          setCfg((p) => ({ ...p, ...c, wallets: c.wallets || {}, pools: c.pools || {},
            hashrates: { ...DEFAULT_HASHRATE, ...(c.hashrates || {}) } }));
        } catch { /* defaults */ }
        try { setMiners(await api.minersStatus()); } catch { /* noop */ }
        api.onLog(pushLog);
        api.onStatus((s) => setRunning(!!s.running));
        api.onBench((m) => {
          if (m.type === 'start') setBench({ active: true, items: m.keys.map((k) => ({ key: k, text: 'wartet …' })) });
          else if (m.type === 'progress')
            setBench((b) => ({ ...b, items: b.items.map((i) => (i.key === m.key ? { ...i, text: m.text } : i)) }));
          else if (m.type === 'done') {
            setBench({ active: false, items: m.results.map((r) => ({ key: r.key, text: `${r.label}: ${r.text}` })) });
            const best = m.results[0];
            if (best && best.score > 0) {
              setCfg((p) => ({ ...p, miner: best.key }));
              pushLog(`» ★ Gewinner: ${best.label} — automatisch ausgewählt.`);
            }
          }
        });
      }
      setLoaded(true);
    })();
  }, []);

  // ---------- Config speichern (debounced) ----------
  useEffect(() => {
    if (!loaded || !api) return;
    const t = setTimeout(() => { api.cfgSave(cfg).catch(() => {}); }, 600);
    return () => clearTimeout(t);
  }, [cfg, loaded]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log, tab]);

  const coin = COINS.find((c) => c.id === cfg.coin) || COINS[0];
  const wallet = (cfg.wallets || {})[coin.id] || '';
  const pool = (cfg.pools || {})[coin.id] || coin.pools[0];
  const setWallet = (id, v) => setCfg((p) => ({ ...p, wallets: { ...p.wallets, [id]: v } }));
  const minerMeta = miners.find((m) => m.key === cfg.miner);

  // ---------- Mining ----------
  async function startMining(exWalletOverride) {
    if (!api) return pushLog('Nur in der EXE verfügbar (Dev-Browser).');
    const w = exWalletOverride !== undefined ? exWalletOverride : wallet;
    if (!w) return pushLog('» Bitte erst Wallet-Adresse eintragen.');
    setBusy(true);
    const r = await api.mineStart({
      coin: coin.id, algo: coin.id, wallet: w, pool,
      worker: cfg.worker, powerPct: cfg.powerPct, minerKey: cfg.miner,
      ex: { enabled: !!cfg.exEnabled, target: cfg.exTarget, pct: Number(cfg.exPct), address: cfg.exAddress },
    }).catch((e) => ({ ok: false, error: String(e) }));
    setBusy(false);
    if (!r.ok) pushLog('» Start fehlgeschlagen: ' + (r.error || 'unbekannt'));
  }
  async function stopMining() {
    if (!api) return;
    await api.mineStop().catch(() => {});
  }
  async function runBenchmark() {
    if (!api) return pushLog('Nur in der EXE verfügbar.');
    if (!wallet) return pushLog('» Benchmark braucht eine Wallet-Adresse.');
    setBench({ active: true, items: [] });
    await api.benchStart({
      algo: coin.id, wallet, pool, worker: cfg.worker, sec: Number(cfg.benchSec) || 60,
    }).catch((e) => pushLog('» Benchmark-Fehler: ' + e));
  }

  // ---------- Coins / Estimates ----------
  async function loadCoins() {
    setCoinsLoading(true);
    try {
      const [wtm, btc] = await Promise.all([fetchWtmCoins(), fetchBtcUsd()]);
      wtmCache.current = wtm;
      btcCache.current = btc;
      applyEstimates(wtm, btc);
      pushLog(`» Estimates: ${Object.keys(wtm).length} WTM-Coins, BTC $${Math.round(btc).toLocaleString('de-DE')}.`);
    } catch (e) {
      setCoinsMeta('WhatToMine nicht erreichbar: ' + e.message);
    }
    setCoinsLoading(false);
  }
  function applyEstimates(wtm, btc) {
    const scale = (Number(cfg.powerPct) || 100) / 100;
    const rowsAll = estimateAll(wtm, cfg.hashrates, scale, btc);
    setRows(rowsAll);
    setCoinsMeta(`WhatToMine live • BTC $${Math.round(btc).toLocaleString('de-DE')} • Leistung ${cfg.powerPct}% berücksichtigt • ${rowsAll.length} Coins`);
  }
  // Leistung/Hashrate-Änderung skaliert vorhandene Daten neu
  useEffect(() => {
    if (wtmCache.current) applyEstimates(wtmCache.current, btcCache.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.powerPct, cfg.hashrates]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (r.tag + ' ' + r.name + ' ' + r.algo).toLowerCase().includes(q);
  });
  function adoptCoin(id) {
    setCfg((p) => ({ ...p, coin: id }));
    setTab('mining');
    pushLog(`» ${id.toUpperCase()} als Mining-Coin übernommen.`);
  }

  // ---------- WalletConnect (EVM: USDT/BTC-Deposit-Adresse holen) ----------
  async function wcConnect() {
    const pid = (cfg.wcProjectId || '').trim();
    if (!pid) return pushLog('» WalletConnect braucht eine Project-ID (cloud.walletconnect.com, gratis).');
    setWcBusy(true);
    try {
      const { default: UniversalProvider } = await import('@walletconnect/universal-provider');
      const provider = await UniversalProvider.init({
        projectId: pid,
        metadata: { name: 'GlowMiner', description: 'Mining payout address connect',
          url: 'https://github.com/maartennoark-gif/GlowMiner', icons: [] },
      });
      wcProvider.current = provider;
      provider.on('display_uri', (uri) => setWcUri(uri));
      const session = await provider.connect({
        namespaces: { eip155: { methods: ['personal_sign'], chains: ['eip155:1'], events: ['accountsChanged'] } },
      });
      const accs = [];
      for (const ns of Object.values(session.namespaces)) for (const a of ns.accounts || []) accs.push(a);
      setWcAccounts(accs);
      const first = (accs[0] || '').split(':').pop() || '';
      if (first) {
        setCfg((p) => ({ ...p, evmAddress: first }));
        pushLog('» Wallet verbunden: ' + first);
      }
      setWcUri('');
    } catch (e) {
      pushLog('» WalletConnect-Fehler: ' + (e.message || e));
    }
    setWcBusy(false);
  }
  async function wcDisconnect() {
    try { await wcProvider.current?.disconnect(); } catch { /* noop */ }
    setWcAccounts([]);
    setWcUri('');
    pushLog('» Wallet getrennt.');
  }
  function pasteInto(setter) {
    navigator.clipboard?.readText().then((t) => { if (t) setter(t.trim()); }).catch(() => {});
  }

  if (!loaded) return <div className="app"><p>Lade …</p></div>;

  return (
    <div className="app">
      <div className="header">
        <h1>GLOWMINER</h1>
        <p>MINING • COINS • WALLETS — AMD + NVIDIA</p>
      </div>
      <div className="divider" />
      {!inElectron && <p className="hint">Dev-Browser: UI-Vorschau — Mining/Benchmark laufen nur in der EXE.</p>}

      <div className="tabs">
        {[['mining', '⛏ Mining'], ['coins', '🔎 Coins'], ['wallets', '👛 Wallets'], ['log', '📜 Log']].map(([id, label]) => (
          <button key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>{label}</button>
        ))}
        <span className="status" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
          {running ? '● mining' : '○ bereit'}
        </span>
      </div>

      {tab === 'mining' && (
        <>
          <div className="card">
            <h3>COIN + MINER</h3>
            <div className="grid2">
              <div>
                <div className="label">Coin</div>
                <select value={cfg.coin} onChange={(e) => setCfg((p) => ({ ...p, coin: e.target.value }))}>
                  {COINS.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.symbol}) — {c.desc}</option>)}
                </select>
                <div className="hint">{coin.pools.length} Pools hinterlegt • {coin.desc}</div>
              </div>
              <div>
                <div className="label">Miner-Software</div>
                <select value={cfg.miner} onChange={(e) => setCfg((p) => ({ ...p, miner: e.target.value }))}>
                  {(miners.length ? miners : [{ key: 'bzminer', label: 'BzMiner (alle Coins)' }]).map((m) => (
                    <option key={m.key} value={m.key}>{m.label}{m.installed === false ? ' — noch nicht geladen' : ''}</option>
                  ))}
                </select>
                <div className="hint">{minerMeta?.note || 'BzMiner läuft auf AMD + NVIDIA für alle 3 Coins.'}</div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <input type="number" value={cfg.benchSec} min={20} max={300}
                onChange={(e) => setCfg((p) => ({ ...p, benchSec: e.target.value }))} style={{ width: 90 }} />
              <button className="btn" disabled={bench.active || !inElectron} onClick={runBenchmark}>
                {bench.active ? '… teste' : '⚡ Besten Miner testen'}
              </button>
              <button className="btn" disabled={!inElectron}
                onClick={() => api.minerDownloadAll(coin.id).catch(() => {})}>Alle Miner laden</button>
            </div>
            {bench.items.length > 0 && (
              <div style={{ marginTop: 8, fontFamily: 'Consolas, monospace', fontSize: 12 }}>
                {bench.items.map((i) => <div key={i.key}>• {i.key}: {i.text}</div>)}
              </div>
            )}
          </div>

          <div className="card">
            <h3>WALLETS (direkt eintippen)</h3>
            {COINS.map((c) => (
              <div className="row" key={c.id} style={{ marginBottom: 8 }}>
                <span className="pill">{c.symbol}</span>
                <input type="text" placeholder={`${c.symbol}-Adresse …`}
                  value={(cfg.wallets || {})[c.id] || ''}
                  onChange={(e) => setWallet(c.id, e.target.value)} />
                <button className="btn" onClick={() => pasteInto((v) => setWallet(c.id, v))}>Paste</button>
              </div>
            ))}
            <div className="grid2" style={{ marginTop: 8 }}>
              <div>
                <div className="label">Pool (editierbar)</div>
                <input type="text" value={pool}
                  onChange={(e) => setCfg((p) => ({ ...p, pools: { ...p.pools, [coin.id]: e.target.value } }))} />
              </div>
              <div>
                <div className="label">Worker</div>
                <input type="text" value={cfg.worker}
                  onChange={(e) => setCfg((p) => ({ ...p, worker: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="card">
            <h3>LEISTUNG (nur Intensity, kein OC/UV)</h3>
            <div className="row">
              <input type="range" min={10} max={100} value={cfg.powerPct}
                onChange={(e) => setCfg((p) => ({ ...p, powerPct: Number(e.target.value) }))} />
              <b style={{ width: 130 }}>{cfg.powerPct}% {Number(cfg.powerPct) >= 100 ? '→ auto' : ''}</b>
            </div>
          </div>

          <div className="card">
            <h3>DIREKT-EXCHANGE → {cfg.exTarget}</h3>
            <div className="row">
              <label><input type="checkbox" checked={!!cfg.exEnabled}
                onChange={(e) => setCfg((p) => ({ ...p, exEnabled: e.target.checked }))} /> Exchange aktiv</label>
              <select value={cfg.exTarget} style={{ width: 120 }}
                onChange={(e) => setCfg((p) => ({ ...p, exTarget: e.target.value }))}>
                {EX_TARGETS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input type="range" min={0} max={100} value={cfg.exPct}
                onChange={(e) => setCfg((p) => ({ ...p, exPct: Number(e.target.value) }))} />
              <b>{cfg.exPct}%</b>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <input type="text" placeholder="Exchange-Deposit-Adresse (MEXC / NonKYC) …"
                value={cfg.exAddress}
                onChange={(e) => setCfg((p) => ({ ...p, exAddress: e.target.value }))} />
              <button className="btn" onClick={() => pasteInto((v) => setCfg((p) => ({ ...p, exAddress: v })))}>Paste</button>
            </div>
            <div className="hint">
              {Number(cfg.exPct) >= 100
                ? `100% → alles direkt auf Exchange-Deposit (${cfg.exTarget}).`
                : `${cfg.exPct}% → Zeit-Split pro 60 Min (Auto-Wechsel im Log).`} 0% = alles auf eigene Wallet.
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <a className="btn" href={coin.exchangeUrl} target="_blank" rel="noreferrer">⇄ Exchange-Seite</a>
              <a className="btn" href="https://woolypooly.com/" target="_blank" rel="noreferrer">Pool-Dashboard</a>
            </div>
          </div>

          <div className="row">
            <button className="btn accent" disabled={busy || running || !inElectron} onClick={() => startMining()}>
              ▶ START MINING
            </button>
            <button className="btn" disabled={!running || !inElectron} onClick={stopMining}>■ STOP</button>
          </div>
        </>
      )}

      {tab === 'coins' && (
        <>
          <div className="card">
            <h3>ALLE COINS BROWSEN (WhatToMine live)</h3>
            <div className="row">
              <input type="text" placeholder="Suchen: Name, Tag oder Algo … (z.B. kawpow, dynex, xelis)"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              <button className="btn" disabled={coinsLoading} onClick={loadCoins}>
                {coinsLoading ? '… lädt' : '↻ Aktualisieren'}
              </button>
            </div>
            <div className="hint">{coinsMeta || 'Noch keine Daten.'}</div>
          </div>
          <details className="card">
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#8a8a8a' }}>
              HASHRATES ANPASSEN (H/s bei 100% — für NVIDIA eigene Werte eintragen)
            </summary>
            <div className="grid2" style={{ marginTop: 8 }}>
              {Object.entries(cfg.hashrates).map(([algo, hs]) => (
                <div className="row" key={algo}>
                  <span className="pill dim" style={{ minWidth: 110 }}>{algo}</span>
                  <input type="number" value={hs}
                    onChange={(e) => setCfg((p) => ({ ...p, hashrates: { ...p.hashrates, [algo]: Number(e.target.value) } }))} />
                </div>
              ))}
            </div>
          </details>
          <div className="tablewrap">
            <table className="est">
              <thead><tr>
                <th>Coin</th><th>Algo</th><th>Coins/Tag*</th><th>$/Tag*</th>
                <th>Vol/Tag</th><th>MarketCap</th><th>Exchange</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.key} className={r.mineable ? 'star' : ''}>
                    <td>{r.tag} <span style={{ color: '#8a8a8a' }}>({r.name.slice(0, 16)})</span></td>
                    <td>{r.algo}</td>
                    <td>{r.perday == null ? '–' : fmt(r.perday)}</td>
                    <td>{r.usd == null ? '–' : '$' + fmt(r.usd, 2)}</td>
                    <td>{r.vol == null ? '–' : '$' + fmt(r.vol)}</td>
                    <td>{r.marketCap || '–'}</td>
                    <td>{r.exchange}</td>
                    <td>{r.mineable && !r.infoOnly
                      ? <button className="btn" onClick={() => adoptCoin(r.tag.toLowerCase())}>Minen</button>
                      : (r.mineable ? <button className="btn" onClick={() => adoptCoin('clore')}>Minen</button> : null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">*ca.-Schätzung: eingestellte Hashrate × Leistung. Börse + Volumen vor dem Minen prüfen — dünne Coins sind schwer verkaufbar.</p>
        </>
      )}

      {tab === 'wallets' && (
        <>
          <div className="card">
            <h3>ADRESSBUCH (Mining + Exchange)</h3>
            {COINS.map((c) => (
              <div className="row" key={c.id} style={{ marginBottom: 8 }}>
                <span className="pill">{c.symbol}</span>
                <input type="text" placeholder={`${c.symbol}-Adresse …`}
                  value={(cfg.wallets || {})[c.id] || ''}
                  onChange={(e) => setWallet(c.id, e.target.value)} />
                <button className="btn" onClick={() => pasteInto((v) => setWallet(c.id, v))}>Paste</button>
              </div>
            ))}
            <div className="row" style={{ marginTop: 8 }}>
              <span className="pill">EVM</span>
              <input type="text" placeholder="0x… (USDT/ETH-Deposit oder eigenes Wallet)"
                value={cfg.evmAddress || ''}
                onChange={(e) => setCfg((p) => ({ ...p, evmAddress: e.target.value }))} />
              <button className="btn" onClick={() => pasteInto((v) => setCfg((p) => ({ ...p, evmAddress: v })))}>Paste</button>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <span className="pill">EX-{cfg.exTarget}</span>
              <input type="text" placeholder="Exchange-Deposit-Adresse …"
                value={cfg.exAddress}
                onChange={(e) => setCfg((p) => ({ ...p, exAddress: e.target.value }))} />
              <button className="btn" onClick={() => {
                const src = (cfg.evmAddress || '').trim();
                if ((cfg.exTarget === 'USDT' || cfg.exTarget === 'ETH') && src)
                  setCfg((p) => ({ ...p, exAddress: src }));
                else pushLog('» EVM-Adresse nur für USDT/ETH als Deposit nutzbar — sonst von der Börse kopieren.');
              }}>EVM übernehmen</button>
            </div>
            <p className="hint">Keys bleiben lokal in config.json — nichts wird hochgeladen. EVM-Adresse ist öffentlich teilbar, niemals Seed/Private-Key eingeben.</p>
          </div>

          <div className="card">
            <h3>WALLET-APP VERBINDEN (WalletConnect, EVM)</h3>
            <p className="hint">
              Verbindet z.B. MetaMask / Trust Wallet per QR und füllt deine öffentliche 0x-Adresse oben ein.
              Braucht eine gratis Project-ID von cloud.walletconnect.com. Mining-Coins (XNA/DNX) sind keine
              EVM-Coins — dafür weiter die Adressen oben + Börsen-Deposit nutzen.
            </p>
            <div className="row">
              <input type="text" placeholder="WalletConnect Project-ID …"
                value={cfg.wcProjectId || ''}
                onChange={(e) => setCfg((p) => ({ ...p, wcProjectId: e.target.value }))} />
              {!wcAccounts.length
                ? <button className="btn accent" disabled={wcBusy || !inElectron} onClick={wcConnect}>
                    {wcBusy ? '… warte auf Wallet' : '⇄ Verbinden'}</button>
                : <button className="btn" onClick={wcDisconnect}>Trennen</button>}
            </div>
            {wcUri && (
              <div>
                <p className="hint">QR mit der Wallet-App scannen:</p>
                <div className="qrbox"><QRCodeSVG value={wcUri} size={200} /></div>
              </div>
            )}
            {wcAccounts.length > 0 && (
              <div style={{ marginTop: 8, fontFamily: 'Consolas, monospace', fontSize: 12 }}>
                {wcAccounts.map((a) => <div key={a}>• {a}</div>)}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'log' && (
        <div className="log" ref={logRef}>
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
      {tab !== 'log' && (
        <div className="log" ref={undefined} style={{ height: 150 }}>
          {log.slice(-30).map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
    </div>
  );
}
