import { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  COINS, DEFAULT_HASHRATE, fmt,
} from './lib.js';

const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
const EX_TARGETS = ['BTC', 'USDT', 'LTC', 'ETH'];

function fmtHs(hs) {
  if (hs == null || !(hs > 0)) return '-';
  if (hs >= 1e9) return (hs / 1e9).toFixed(2) + ' GH/s';
  if (hs >= 1e6) return (hs / 1e6).toFixed(2) + ' MH/s';
  if (hs >= 1e3) return (hs / 1e3).toFixed(2) + ' kH/s';
  return Math.round(hs) + ' H/s';
}
function fmtUptime(s) {
  s = Math.max(0, Math.floor(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  return (h > 0 ? h + 'h ' : '') + String(m).padStart(2, '0') + 'm ' + String(ss).padStart(2, '0') + 's';
}

export default function App() {
  const [tab, setTab] = useState('mining');
  const [cfg, setCfg] = useState({
    coin: 'xna', mode: 'pool', wallets: {}, pools: {}, worker: 'GlowMiner',
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
  const [log, setLog] = useState(['GlowMiner ready.']);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [coinsLoading, setCoinsLoading] = useState(false);
  const [coinsMeta, setCoinsMeta] = useState('');
  const [wcUri, setWcUri] = useState('');
  const [wcAccounts, setWcAccounts] = useState([]);
  const [wcBusy, setWcBusy] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [backendVersion, setBackendVersion] = useState('');
  const [diagBusy, setDiagBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const [gpu, setGpu] = useState(null);
  const [poolInfo, setPoolInfo] = useState(null);
  const [poolLoading, setPoolLoading] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingResults, setPingResults] = useState([]);
  const wtmCache = useRef(null);
  const btcCache = useRef(84000);
  const estScale = useRef(1);
  const wcProvider = useRef(null);
  const logRef = useRef(null);

  const pushLog = (line) =>
    setLog((l) => [...l.slice(-499), String(line).replace(/\n$/, '')]);

  useEffect(() => {
    (async () => {
      if (inTauri) {
        try {
          const c = await invoke('cfg_load');
          setCfg((p) => ({ ...p, ...c, wallets: c.wallets || {}, pools: c.pools || {},
            hashrates: { ...DEFAULT_HASHRATE, ...(c.hashrates || {}) } }));
        } catch { /* defaults */ }
        try { setMiners(await invoke('miners_status')); } catch { /* noop */ }
        try { setBackendVersion(await invoke('app_version')); } catch { /* noop */ }
        await listen('mine-log', (e) => pushLog(e.payload));
        await listen('mine-status', (e) => setRunning(!!e.payload.running));
        await listen('bench-update', (m) => {
          const p = m.payload;
          if (p.type === 'start') setBench({ active: true, items: p.keys.map((k) => ({ key: k, text: 'waiting' })) });
          else if (p.type === 'progress')
            setBench((b) => ({ ...b, items: b.items.map((i) => (i.key === p.key ? { ...i, text: p.text } : i)) }));
          else if (p.type === 'done') {
            setBench({ active: false, items: p.results.map((r) => ({ key: r.key, text: `${r.label}: ${r.text}` })) });
            const best = p.results[0];
            if (best && best.score > 0) {
              setCfg((prev) => ({ ...prev, miner: best.key }));
              pushLog(`[benchmark] winner: ${best.label} — selected automatically.`);
            }
          }
        });
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded || !inTauri) return;
    const t = setTimeout(() => { invoke('cfg_save', { data: cfg }).catch(() => {}); }, 600);
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

  async function startMining() {
    if (!inTauri) return pushLog('Available only in the app build.');
    if (!wallet.trim()) return pushLog('Enter the wallet address first.');
    setBusy(true);
    try {
      await invoke('mine_start', { opts: {
        algo: coin.id, wallet: wallet.trim(), pool, worker: cfg.worker,
        powerPct: Number(cfg.powerPct), minerKey: cfg.miner, mode: cfg.mode || 'pool',
        ex: { enabled: !!cfg.exEnabled, target: cfg.exTarget, pct: Number(cfg.exPct), address: (cfg.exAddress || '').trim() },
      }});
    } catch (e) { pushLog('Start failed: ' + e); }
    setBusy(false);
  }
  async function stopMining() {
    if (!inTauri) return;
    await invoke('mine_stop').catch(() => {});
  }
  async function runBenchmark() {
    if (!inTauri) return pushLog('Available only in the app build.');
    if (!wallet.trim()) return pushLog('Benchmark needs a wallet address.');
    setBench({ active: true, items: [] });
    try {
      await invoke('bench_start', { opts: {
        algo: coin.id, wallet: wallet.trim(), pool, worker: cfg.worker, sec: Number(cfg.benchSec) || 60,
      }});
    } catch (e) { pushLog('Benchmark error: ' + e); setBench((b) => ({ ...b, active: false })); }
  }

  async function loadCoins() {
    if (!inTauri) return pushLog('Available only in the app build.');
    setCoinsLoading(true);
    try {
      const res = await invoke('estimates_fetch', { req: {
        powerPct: Number(cfg.powerPct) || 100, hashrates: cfg.hashrates,
      }});
      estScale.current = (Number(cfg.powerPct) || 100) / 100;
      setRows(res.rows || []);
      setCoinsMeta(`WhatToMine live - BTC $${Math.round(res.btc).toLocaleString('de-DE')} (${res.btc_src}) - Leistung ${cfg.powerPct}% - ${(res.rows || []).length} Coins`);
      pushLog(`[estimates] ${(res.rows || []).length} Coins (BTC via ${res.btc_src}).`);
    } catch (e) {
      setCoinsMeta('Fehler: ' + e);
      pushLog('[estimates] Fehler: ' + e);
    }
    setCoinsLoading(false);
  }
  // Leistungs-Regler skaliert geladene Werte ohne Neuabruf
  function rescaleRows(pct) {
    const old = estScale.current || 1;
    const next = (Number(pct) || 100) / 100;
    if (!old || old === next) { estScale.current = next; return; }
    const f = next / old;
    setRows((rs) => rs.map((r) => ({
      ...r,
      perday: r.perday == null ? null : r.perday * f,
      usd: r.usd == null ? null : r.usd * f,
    })));
    estScale.current = next;
  }

  async function runDiagnostics() {
    if (!inTauri) return pushLog('Available only in the app build.');
    setDiagBusy(true);
    pushLog('[diagnose] Backend v' + (backendVersion || '?'));
    try {
      const res = await invoke('estimates_fetch', { req: {
        powerPct: Number(cfg.powerPct) || 100, hashrates: cfg.hashrates,
      }});
      pushLog(`[diagnose] Coin-Abruf OK (${(res.rows || []).length} Coins, BTC via ${res.btc_src}).`);
    } catch (e) { pushLog('[diagnose] Coin-Abruf FEHLER: ' + e); }
    const wt = (COINS.find((c) => c.id === cfg.coin) || {}).woolyTag;
    if (wt) {
      try {
        const info = await invoke('pool_stats', { tag: wt });
        pushLog('[diagnose] Pool-Stats OK (Fee ' + (info.stats?.fee ?? '?') + '%).');
      } catch (e) { pushLog('[diagnose] Pool-Stats FEHLER: ' + e); }
    } else {
      pushLog('[diagnose] Pool-Stats: dieser Coin läuft nicht über WoolyPooly.');
    }
    try {
      const res = await invoke('pool_ping', { hosts: [pool] });
      const ms = res[0]?.ms;
      pushLog('[diagnose] Pool-Ping ' + pool + ': ' + (ms == null ? 'TIMEOUT' : ms + ' ms'));
    } catch (e) { pushLog('[diagnose] Pool-Ping FEHLER: ' + e); }
    setDiagBusy(false);
  }

  // Live-Polling während Mining läuft (Status, Hashrate, GPU)
  useEffect(() => {
    if (!inTauri || !running) return;
    let dead = false;
    async function poll() {
      try {
        const s = await invoke('mine_stats');
        if (!dead) setStats(s);
      } catch { /* noop */ }
      try {
        const g = await invoke('gpu_stats');
        if (!dead) setGpu(g);
      } catch { /* noop */ }
    }
    poll();
    const t = setInterval(poll, 5000);
    return () => { dead = true; clearInterval(t); };
  }, [running]);

  // Pool-Livedaten bei Coin-Wechsel laden
  async function loadPoolInfo(tag) {
    const wt = (COINS.find((c) => c.id === (tag || cfg.coin)) || {}).woolyTag;
    if (!inTauri || !wt) { setPoolInfo(wt ? null : { supported: false }); return; }
    setPoolLoading(true);
    try {
      const info = await invoke('pool_stats', { tag: wt });
      setPoolInfo(info);
    } catch (e) {
      setPoolInfo({ supported: false, error: String(e) });
    }
    setPoolLoading(false);
  }
  useEffect(() => {
    loadPoolInfo(cfg.coin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.coin]);
  useEffect(() => {
    rescaleRows(cfg.powerPct);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.powerPct]);

  function setMode(m) {
    const c = COINS.find((x) => x.id === cfg.coin);
    if (m === 'solo' && (!c.soloPools || !c.soloPools.length)) {
      pushLog('Solo: kein bekannter Solo-Port für diesen Coin/Pool - siehe Pool-Seite.');
      return;
    }
    const targetPool = m === 'solo' ? c.soloPools[0] : c.pools[0];
    setCfg((p) => ({ ...p, mode: m, pools: { ...p.pools, [c.id]: targetPool } }));
    pushLog(`Modus: ${m.toUpperCase()} - Pool: ${targetPool}`);
  }

  async function findBestPool() {
    if (!inTauri) return pushLog('Available only in the app build.');
    const c = COINS.find((x) => x.id === cfg.coin);
    const hosts = [...c.pools, ...(c.soloPools || [])];
    setPinging(true);
    setPingResults([]);
    try {
      const res = await invoke('pool_ping', { hosts });
      setPingResults(res);
      const ok = res.filter((r) => r.ms != null).sort((a, b) => a.ms - b.ms);
      if (ok.length) {
        const best = ok[0];
        setCfg((p) => ({ ...p, pools: { ...p.pools, [c.id]: best.host } }));
        const soloHit = (c.soloPools || []).includes(best.host);
        if (soloHit) setCfg((p) => ({ ...p, mode: 'solo' }));
        pushLog(`Bester Pool: ${best.host} (${best.ms} ms) - übernommen.`);
      } else {
        pushLog('Kein Pool erreichbar - Firewall/Internet prüfen.');
      }
    } catch (e) { pushLog('Pool-Suche fehlgeschlagen: ' + e); }
    setPinging(false);
  }

  const filtered = rows.filter((r) => {    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (r.tag + ' ' + r.name + ' ' + r.algo).toLowerCase().includes(q);
  });
  function adoptCoin(id) {
    setCfg((p) => ({ ...p, coin: id }));
    setTab('mining');
    pushLog(`[${id.toUpperCase()}] set as mining coin.`);
  }

  async function wcConnect() {
    const pid = (cfg.wcProjectId || '').trim();
    if (!pid) return pushLog('WalletConnect needs a project ID (cloud.walletconnect.com, free).');
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
        pushLog('Wallet connected: ' + first);
      }
      setWcUri('');
    } catch (e) {
      pushLog('WalletConnect error: ' + (e.message || e));
    }
    setWcBusy(false);
  }
  async function wcDisconnect() {
    try { await wcProvider.current?.disconnect(); } catch { /* noop */ }
    setWcAccounts([]);
    setWcUri('');
    pushLog('Wallet disconnected.');
  }
  function pasteInto(setter) {
    if (navigator.clipboard?.readText) {
      navigator.clipboard.readText().then((t) => { if (t) setter(t.trim()); }).catch(() => {});
    }
  }
  async function openExt(url) {
    if (inTauri) { try { await openUrl(url); return; } catch { /* fallback */ } }
    window.open(url, '_blank', 'noopener');
  }

  if (!loaded) return <div className="app"><p>Loading</p></div>;

  return (
    <div className="app">
      <div className="header">
        <h1>GLOWMINER</h1>
        <p>MINING - COINS - WALLETS - AMD + NVIDIA</p>
      </div>
      <div className="divider" />
      {!inTauri && <p className="hint">Browser preview: mining and benchmark only run in the app build.</p>}

      <div className="tabs">
        {[['mining', 'Mining'], ['coins', 'Coins'], ['wallets', 'Wallets']].map(([id, label]) => (
          <button key={id} className={'tab' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>{label}</button>
        ))}
        <button className={'tab' + (logOpen ? ' active' : '')} onClick={() => setLogOpen((v) => !v)}>
          {logOpen ? 'Logs ausblenden' : 'Logs einblenden'}
        </button>
        <span className="status" style={{ marginLeft: 'auto', alignSelf: 'center' }}>
          {running ? 'MINING' : 'READY'}
        </span>
      </div>

      {tab === 'mining' && (
        <>
          <div className="dash">
            <div className="dashcard">
              <div className="label">Status</div>
              <div className="dashbig">{running ? 'MINING' : 'READY'}</div>
              <div className="hint">
                {(stats?.miner || cfg.miner)} - {(stats?.mode || cfg.mode || 'pool').toUpperCase()} - {(stats?.algo || coin.id).toUpperCase()}
                {stats ? ` - Uptime ${fmtUptime(stats.uptime_s)}` : ''}
              </div>
            </div>
            <div className="dashcard">
              <div className="label">Hashrate (live)</div>
              <div className="dashbig">{stats && stats.hashrate_hs > 0 ? fmtHs(stats.hashrate_hs) : '-'}</div>
              <div className="hint">
                {(() => {
                  const r = rows.find((x) => x.tag === coin.tag && x.perday != null);
                  return r ? `Erwartet ca. ${fmt(r.perday)} ${coin.symbol}/Tag` : 'Estimate im Coins-Tab laden';
                })()}
              </div>
            </div>
            <div className="dashcard">
              <div className="label">GPU</div>
              <div className="dashbig">
                {(() => {
                  if (gpu?.nvidia?.length) {
                    const g = gpu.nvidia[0];
                    return (g.temp_c ?? '-') + ' C';
                  }
                  if (gpu?.amd_temp_c != null) return Math.round(gpu.amd_temp_c) + ' C';
                  return '-';
                })()}
              </div>
              <div className="hint">
                {(() => {
                  if (gpu?.nvidia?.length) {
                    const g = gpu.nvidia[0];
                    return `Last ${g.util_pct ?? '-'}% - ${g.power_w ?? '-'}W - Lüfter ${g.fan_pct ?? '-'}%${gpu.nvidia.length > 1 ? ` (+${gpu.nvidia.length - 1} GPUs)` : ''}`;
                  }
                  if (gpu?.amd_temp_c != null) return 'AMD: Temp aus Miner-Log (Richtwert)';
                  return running ? 'Läuft - noch keine GPU-Daten' : 'Startet mit Mining';
                })()}
              </div>
            </div>
            <div className="dashcard">
              <div className="label">Shares</div>
              <div className="dashbig">{stats ? `${stats.accepted} ok` : '-'}</div>
              <div className="hint">{stats ? `${stats.rejected} rejected/stale` : 'aus Miner-Log gezählt'}</div>
            </div>
            <div className="dashcard">
              <div className="label">Pool</div>
              <div className="dashbig" style={{ fontSize: 16 }}>
                {poolInfo?.supported ? `${poolInfo.stats.fee}% Fee` : (poolInfo && !poolInfo.supported ? 'Extern' : '-')}
              </div>
              <div className="hint">
                {poolLoading ? 'Lade Pooldaten' :
                  poolInfo?.supported ? (() => {
                    const st = poolInfo.stats;
                    const mode = (stats?.mode || cfg.mode || 'pool').toUpperCase();
                    const m = (st.modes || []).find((x) => (x.payoutScheme || '').toUpperCase() === mode)
                      || (st.modes || [])[0] || {};
                    const ph = m.algo_stats?.default?.hashrate;
                    return `Effort ${mode}: ${Math.round((m.effort || 0) * 100)}% - Pool-HR ${ph ? fmtHs(ph) : '-'} - Miner ${m.algo_stats?.default?.minersTotal ?? '-'}`;
                  })() : (poolInfo?.error ? `Fehler: ${poolInfo.error}` : 'Live-Daten nur für WoolyPooly-Coins')}
              </div>
            </div>
          </div>

          <div className="card">
            <h3>MODUS + POOL</h3>
            <div className="row">
              <button className={'tab' + ((cfg.mode || 'pool') === 'pool' ? ' active' : '')}
                onClick={() => setMode('pool')}>Pool (PPLNS)</button>
              <button className={'tab' + (cfg.mode === 'solo' ? ' active' : '')}
                onClick={() => setMode('solo')}
                title={coin.soloPools?.length ? '' : 'Kein Solo-Port bekannt'}>Solo</button>
              <button className="btn" disabled={pinging || !inTauri} onClick={findBestPool}>
                {pinging ? 'Messe' : 'Besten Pool finden'}
              </button>
              <button className="btn" disabled={poolLoading} onClick={() => loadPoolInfo(cfg.coin)}>Pool-Daten</button>
            </div>
            {!coin.soloPools?.length && (
              <div className="hint">Solo: für diesen Coin/Pool ist kein Solo-Port bekannt - bitte Pool-Seite prüfen.</div>
            )}
            {pingResults.length > 0 && (
              <div style={{ marginTop: 8, fontFamily: 'Consolas, monospace', fontSize: 12 }}>
                {pingResults.map((r) => <div key={r.host}>- {r.host}: {r.ms == null ? 'timeout' : r.ms + ' ms'}</div>)}
              </div>
            )}
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
            <h3>COIN + MINER</h3>
            <div className="grid2">
              <div>
                <div className="label">Coin</div>
                <select value={cfg.coin} onChange={(e) => setCfg((p) => ({ ...p, coin: e.target.value }))}>
                  {COINS.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
                </select>
                <div className="hint">{coin.desc}</div>
              </div>
              <div>
                <div className="label">Miner software</div>
                <select value={cfg.miner} onChange={(e) => setCfg((p) => ({ ...p, miner: e.target.value }))}>
                  {(miners.length ? miners : [{ key: 'bzminer', label: 'BzMiner (alle Coins)' }]).map((m) => (
                    <option key={m.key} value={m.key}>{m.label}{m.installed === false ? ' - not downloaded' : ''}</option>
                  ))}
                </select>
                <div className="hint">{minerMeta?.note || 'BzMiner runs on AMD + NVIDIA for all 3 coins.'}</div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 10 }}>
              <input type="number" value={cfg.benchSec} min={20} max={300}
                onChange={(e) => setCfg((p) => ({ ...p, benchSec: e.target.value }))} style={{ width: 90 }} />
              <button className="btn" disabled={bench.active || !inTauri} onClick={runBenchmark}>
                {bench.active ? 'Testing' : 'Test best miner'}
              </button>
              <button className="btn" disabled={!inTauri}
                onClick={() => invoke('miner_download_all', { algo: coin.id }).catch(() => {})}>Load all miners</button>
              <button className="btn" disabled={!inTauri}
                title="Versucht, den Miner-Ordner als Antivirus-Ausnahme einzutragen (braucht Admin)"
                onClick={async () => {
                  pushLog('Requesting antivirus exclusion for the miner folder (needs admin)...');
                  try {
                    const msg = await invoke('defender_exclude');
                    pushLog(String(msg));
                  } catch (e) { pushLog('Antivirus exclusion failed: ' + e); }
                }}>Defender exception</button>
            </div>
            <div className="hint">If the miner vanishes right after download (spawn ENOENT), Windows Defender quarantined it. Set an exclusion for the miner folder, then load miners again.</div>
            {bench.items.length > 0 && (
              <div style={{ marginTop: 8, fontFamily: 'Consolas, monospace', fontSize: 12 }}>
                {bench.items.map((i) => <div key={i.key}>- {i.key}: {i.text}</div>)}
              </div>
            )}
          </div>

          <div className="card">
            <h3>WALLET - {coin.symbol} (selected coin only)</h3>
            <div className="row">
              <span className="pill">{coin.symbol}</span>
              <input type="text" placeholder={`${coin.symbol} address`}
                value={wallet} onChange={(e) => setWallet(coin.id, e.target.value)} />
              <button className="btn" onClick={() => pasteInto((v) => setWallet(coin.id, v))}>Paste</button>
            </div>
            <div className="hint">Start-Adresse: {coin.symbol}-Format (z.B. xel:...) oder Exchange-Deposit für Direkt-Mining.</div>
          </div>

          <div className="card">
            <h3>POWER (intensity only, no OC/UV)</h3>
            <div className="row">
              <input type="range" min={10} max={100} value={cfg.powerPct}
                onChange={(e) => setCfg((p) => ({ ...p, powerPct: Number(e.target.value) }))} />
              <b style={{ width: 130 }}>{cfg.powerPct}% {Number(cfg.powerPct) >= 100 ? '- auto' : ''}</b>
            </div>
          </div>

          <div className="card">
            <h3>DIRECT EXCHANGE to {cfg.exTarget}</h3>
            <div className="row">
              <label><input type="checkbox" checked={!!cfg.exEnabled}
                onChange={(e) => setCfg((p) => ({ ...p, exEnabled: e.target.checked }))} /> Exchange active</label>
              <select value={cfg.exTarget} style={{ width: 120 }}
                onChange={(e) => setCfg((p) => ({ ...p, exTarget: e.target.value }))}>
                {EX_TARGETS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <input type="range" min={0} max={100} value={cfg.exPct}
                onChange={(e) => setCfg((p) => ({ ...p, exPct: Number(e.target.value) }))} />
              <b>{cfg.exPct}%</b>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <input type="text" placeholder="Exchange deposit address (MEXC / NonKYC)"
                value={cfg.exAddress}
                onChange={(e) => setCfg((p) => ({ ...p, exAddress: e.target.value }))} />
              <button className="btn" onClick={() => pasteInto((v) => setCfg((p) => ({ ...p, exAddress: v })))}>Paste</button>
            </div>
            <div className="hint">
              {Number(cfg.exPct) >= 100
                ? `100 percent: everything mines directly to the exchange deposit (${cfg.exTarget}).`
                : `${cfg.exPct} percent: time split per 60 min (auto switch in log).`} 0 percent: everything stays on your own wallet.
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn" onClick={() => openExt(coin.exchangeUrl)}>Exchange page</button>
              <button className="btn" onClick={() => openExt('https://woolypooly.com/')}>Pool dashboard</button>
            </div>
          </div>

          <div className="card">
            <h3>DIAGNOSE{backendVersion ? ` (Backend v${backendVersion})` : ''}</h3>
            <div className="row">
              <button className="btn" disabled={diagBusy || !inTauri} onClick={runDiagnostics}>
                {diagBusy ? 'Prüfe' : 'Verbindung testen'}
              </button>
            </div>
            <div className="hint">Prüft Coin-Abruf, Pool-Stats und Pool-Ping - Ergebnis steht im Log. Falls hier Version 3.1.x steht: bitte auf 3.2.1+ updaten.</div>
          </div>

          <div className="row">
            <button className="btn accent" disabled={busy || running || !inTauri} onClick={startMining}>START</button>
            <button className="btn" disabled={!running || !inTauri} onClick={stopMining}>STOP</button>
          </div>
        </>
      )}

      {tab === 'coins' && (
        <>
          <div className="card">
            <h3>BROWSE ALL COINS (WhatToMine live)</h3>
            <div className="row">
              <input type="text" placeholder="Search: name, tag or algo (e.g. kawpow, dynex, xelis)"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              <button className="btn" disabled={coinsLoading} onClick={loadCoins}>
                {coinsLoading ? 'Loading' : 'Refresh'}
              </button>
            </div>
            <div className="hint">{coinsMeta || 'No data yet.'}</div>
          </div>
          <details className="card">
            <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 12, letterSpacing: 2, color: '#8a8a8a' }}>
              ADJUST HASHRATES (H/s at 100 percent - enter own values for NVIDIA)
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
                <th>Coin</th><th>Algo</th><th>Coins/day*</th><th>$/day*</th>
                <th>Vol/day</th><th>MarketCap</th><th>Exchange</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.key} className={r.mineable ? 'star' : ''}>
                    <td>{r.tag} <span style={{ color: '#8a8a8a' }}>({r.name.slice(0, 16)})</span></td>
                    <td>{r.algo}</td>
                    <td>{r.perday == null ? '-' : fmt(r.perday)}</td>
                    <td>{r.usd == null ? '-' : '$' + fmt(r.usd, 2)}</td>
                    <td>{r.vol == null ? '-' : '$' + fmt(r.vol)}</td>
                    <td>{r.marketCap || '-'}</td>
                    <td>{r.exchange}</td>
                    <td>{r.mineable
                      ? <button className="btn" onClick={() => adoptCoin(r.tag === 'CLORE' ? 'clore' : r.tag.toLowerCase())}>Mine</button>
                      : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">* Rough estimate: configured hashrate x power setting. Check exchange + volume before mining - thin coins are hard to sell.</p>
        </>
      )}

      {tab === 'wallets' && (
        <>
          <div className="card">
            <h3>WALLET - {coin.symbol} (selected coin)</h3>
            <div className="row" style={{ marginBottom: 8 }}>
              <select value={cfg.coin} style={{ maxWidth: 260 }}
                onChange={(e) => setCfg((p) => ({ ...p, coin: e.target.value }))}>
                {COINS.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
              </select>
            </div>
            <div className="row">
              <span className="pill">{coin.symbol}</span>
              <input type="text" placeholder={`${coin.symbol} address`}
                value={wallet} onChange={(e) => setWallet(coin.id, e.target.value)} />
              <button className="btn" onClick={() => pasteInto((v) => setWallet(coin.id, v))}>Paste</button>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <span className="pill">EVM</span>
              <input type="text" placeholder="0x address (USDT/ETH deposit or own wallet)"
                value={cfg.evmAddress || ''}
                onChange={(e) => setCfg((p) => ({ ...p, evmAddress: e.target.value }))} />
              <button className="btn" onClick={() => pasteInto((v) => setCfg((p) => ({ ...p, evmAddress: v })))}>Paste</button>
            </div>
            <div className="row" style={{ marginTop: 8 }}>
              <span className="pill">EX-{cfg.exTarget}</span>
              <input type="text" placeholder="Exchange deposit address"
                value={cfg.exAddress}
                onChange={(e) => setCfg((p) => ({ ...p, exAddress: e.target.value }))} />
              <button className="btn" onClick={() => {
                const src = (cfg.evmAddress || '').trim();
                if ((cfg.exTarget === 'USDT' || cfg.exTarget === 'ETH') && src)
                  setCfg((p) => ({ ...p, exAddress: src }));
                else pushLog('EVM address only works as deposit for USDT/ETH - otherwise copy it from the exchange.');
              }}>Use EVM</button>
            </div>
            <p className="hint">Keys stay local in config.json - nothing is uploaded. An EVM address is safe to share, never enter a seed or private key.</p>
          </div>

          <div className="card">
            <h3>CONNECT WALLET APP (WalletConnect, EVM)</h3>
            <p className="hint">
              Connects e.g. MetaMask / Trust Wallet via QR and fills your public 0x address above.
              Needs a free project ID from cloud.walletconnect.com. Mining coins (XNA/DNX) are not
              EVM coins - keep using the addresses above plus exchange deposits for those.
            </p>
            <div className="row">
              <input type="text" placeholder="WalletConnect project ID"
                value={cfg.wcProjectId || ''}
                onChange={(e) => setCfg((p) => ({ ...p, wcProjectId: e.target.value }))} />
              {!wcAccounts.length
                ? <button className="btn accent" disabled={wcBusy || !inTauri} onClick={wcConnect}>
                    {wcBusy ? 'Waiting for wallet' : 'Connect'}</button>
                : <button className="btn" onClick={wcDisconnect}>Disconnect</button>}
            </div>
            {wcUri && (
              <div>
                <p className="hint">Scan the QR code with the wallet app:</p>
                <div className="qrbox"><QRCodeSVG value={wcUri} size={200} /></div>
              </div>
            )}
            {wcAccounts.length > 0 && (
              <div style={{ marginTop: 8, fontFamily: 'Consolas, monospace', fontSize: 12 }}>
                {wcAccounts.map((a) => <div key={a}>- {a}</div>)}
              </div>
            )}
          </div>
        </>
      )}

      {logOpen && (
        <div className="drawer">
          <div className="drawerhead">
            <b>LOGS</b>
            <div className="row">
              <button className="btn" onClick={() => setLog([])}>Clear</button>
              <button className="btn" onClick={() => setLogOpen(false)}>Ausblenden</button>
            </div>
          </div>
          <div className="log drawerlog" ref={logRef}>
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}
