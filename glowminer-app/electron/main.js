// GlowMiner — Electron main: Miner-Registry, Spawning, Benchmark, Downloads.
// Läuft mit plain Node (ESM). Kein OC/UV — nur Intensity-Parameter.
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { spawn, execFile } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function appDir() {
  if (app.isPackaged) return path.dirname(app.getPath('exe'));
  return path.join(__dirname, '..');
}
const APP_DIR = () => appDir();
const CONFIG_PATH = () => path.join(APP_DIR(), 'config.json');

const MINERS = {
  bzminer: {
    label: 'BzMiner (alle Coins)', exeRel: 'bzminer/bzminer.exe',
    repo: 'bzminer/bzminer', supports: ['xna', 'clore', 'dynex'],
    note: 'KawPow + Dynex auf AMD & NVIDIA. Intensity-Slider wird unterstützt.',
  },
  teamredminer: {
    label: 'TeamRedMiner (AMD KawPow)', exeRel: 'teamredminer/teamredminer.exe',
    repo: 'todxx/teamredminer', supports: ['xna', 'clore'],
    note: 'Stark auf AMD KawPow. Kein Dynex.',
  },
  srbminer: {
    label: 'SRBMiner-Multi (Allround)', exeRel: 'srbminer/SRBMiner-MULTI.exe',
    repo: 'doktor83/SRBMiner-Multi', supports: ['xna', 'clore'],
    note: 'KawPow auf AMD & NVIDIA. Kein DynexSolve.',
  },
  wildrig: {
    label: 'WildRig-Multi (Alt)', exeRel: 'wildrig/wildrig.exe',
    repo: 'andru-kun/wildrig-multi', supports: ['xna', 'clore'],
    note: 'KawPow-Fallback.',
  },
  onezerominer: {
    label: 'OneZeroMiner (Dynex/Xelis)', exeRel: 'onezerominer/onezerominer.exe',
    repo: 'OneZeroMiner/onezerominer', supports: ['dynex'],
    note: 'Dynex primär NVIDIA-optimiert — als Vergleich dabei.',
  },
};
const MINER_ALGO = {
  bzminer: { xna: 'xna', clore: 'clore', dynex: 'dynex' },
  teamredminer: { xna: 'kawpow', clore: 'kawpow' },
  srbminer: { xna: 'kawpow', clore: 'kawpow' },
  wildrig: { xna: 'kawpow', clore: 'kawpow' },
  onezerominer: { dynex: 'dynex' },
};
const COIN_DEFAULT_POOL = {
  xna: 'stratum+tcp://pool.woolypooly.com:3128',
  clore: 'stratum+tcp://pool.woolypooly.com:3118',
  dynex: 'stratum+tcp://fr-dynex.miningocean.org:3332',
};

let win = null;
let child = null;         // laufender Miner-Prozess
let childReaderOn = false;
let exTimer = null;       // Exchange-Rotation
let benchRunning = false;

function sendLog(line) {
  if (win && !win.isDestroyed()) win.webContents.send('mine:log', String(line));
}
function sendStatus(s) {
  if (win && !win.isDestroyed()) win.webContents.send('mine:status', s);
}
function sendBench(msg) {
  if (win && !win.isDestroyed()) win.webContents.send('bench:update', msg);
}

function powerToIntensity(pct) {
  if (pct >= 100) return 0;
  return Math.max(6, Math.min(64, Math.round((pct * 64) / 100)));
}
function minerExe(key) {
  return path.join(APP_DIR(), ...MINERS[key].exeRel.split('/'));
}
async function exeExists(key) {
  try {
    await fs.access(minerExe(key));
    return true;
  } catch { return false; }
}

function buildCmd(key, algo, { wallet, pool, worker, powerPct }) {
  const exe = minerExe(key);
  const malgo = (MINER_ALGO[key] || {})[algo];
  if (!malgo) throw new Error(`${MINERS[key].label} unterstützt ${algo.toUpperCase()} nicht.`);
  const intensity = powerToIntensity(powerPct);
  pool = pool || COIN_DEFAULT_POOL[algo];
  const poolNoProto = pool.replace(/^stratum\+(tcp|ssl):\/\//, '');
  worker = worker || 'GlowMiner';
  if (key === 'bzminer') {
    let cmd;
    if (algo === 'dynex') {
      cmd = [exe, '-a', 'dynex', '-p', pool, '-w', wallet, '--pool_password', worker, '--nc', '1'];
    } else {
      cmd = [exe, '-a', malgo, '-w', `${wallet}.${worker}`, '-p', pool];
    }
    if (intensity !== 0) cmd.push('--i1', String(intensity));
    return cmd;
  }
  if (key === 'teamredminer') {
    return [exe, '-a', malgo, '-o', poolNoProto, '-u', `${wallet}.${worker}`, '-p', 'x', '--watchdog_script=false'];
  }
  if (key === 'srbminer') {
    const cmd = [exe, '--algorithm', malgo, '--pool', poolNoProto, '--wallet', wallet, '--worker', worker, '--password', 'x'];
    if (intensity !== 0) cmd.push('--intensity', String(intensity));
    return cmd;
  }
  if (key === 'wildrig') {
    return [exe, '--algo', malgo, '--url', poolNoProto, '--user', `${wallet}.${worker}`, '--pass', 'x', '--opencl-threads', 'auto'];
  }
  if (key === 'onezerominer') {
    if (algo === 'dynex') return [exe, '--dynex', '-w', wallet, '-o', poolNoProto, '-r', worker];
    return [exe, '--xelis', '-w', wallet, '-o', poolNoProto, '-r', worker];
  }
  throw new Error('Unbekannter Miner: ' + key);
}

function spawnMiner(cmd, cwd, tag) {
  sendLog(`» [${tag}] ${cmd.join(' ')}`);
  child = spawn(cmd[0], cmd.slice(1), { cwd });
  childReaderOn = true;
  child.stdout.on('data', (d) => sendLog(d.toString()));
  child.stderr.on('data', (d) => sendLog(d.toString()));
  child.on('close', (code) => {
    if (childReaderOn) sendLog('[miner beendet]');
    child = null;
    sendStatus({ running: false });
  });
  child.on('error', (e) => sendLog(`» start-fehler: ${e.message}`));
  sendStatus({ running: true, tag });
}

// ---------- GitHub-Download ----------
function ghGetJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'glowminer' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        ghGetJson(res.headers.location).then(resolve, reject);
        return;
      }
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = [];
    https.get(url, { headers: { 'User-Agent': 'glowminer' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        downloadFile(res.headers.location, dest).then(resolve, reject);
        return;
      }
      res.on('data', (c) => file.push(c));
      res.on('end', async () => {
        try { await fs.writeFile(dest, Buffer.concat(file)); resolve(); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}
async function downloadMiner(key) {
  const meta = MINERS[key];
  sendLog(`» [${key}] suche Release ${meta.repo} …`);
  const rel = await ghGetJson(`https://api.github.com/repos/${meta.repo}/releases/latest`);
  const assets = rel.assets || [];
  let asset = assets.find((a) => {
    const n = (a.name || '').toLowerCase();
    if (!n.endsWith('.zip')) return false;
    if (!/win|windows/.test(n)) return false;
    if (key === 'teamredminer' && !n.includes('win64')) return false;
    return true;
  }) || assets.find((a) => (a.name || '').toLowerCase().endsWith('.zip'));
  if (!asset) throw new Error('kein Windows-ZIP im Release gefunden');
  const destDir = path.join(APP_DIR(), key);
  await fs.mkdir(destDir, { recursive: true });
  const zpath = path.join(destDir, `${key}_win.zip`);
  sendLog(`» [${key}] lade ${asset.name} …`);
  await downloadFile(asset.browser_download_url, zpath);
  // Entpacken via PowerShell (Windows)
  await new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-Command',
      `Expand-Archive -LiteralPath '${zpath}' -DestinationPath '${destDir}' -Force`],
      (err) => (err ? reject(err) : resolve()));
  });
  // exe finden
  async function findExe(dir) {
    const want = path.basename(meta.exeRel).toLowerCase();
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        const f = await findExe(p);
        if (f) return f;
      } else if (e.name.toLowerCase() === want) return p;
    }
    return null;
  }
  let found = await findExe(destDir);
  if (!found) {
    // Fallback: erste exe
    async function firstExe(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          const f = await firstExe(p);
          if (f) return f;
        } else if (e.name.toLowerCase().endsWith('.exe')) return p;
      }
      return null;
    }
    found = await firstExe(destDir);
  }
  if (found) sendLog(`» [${key}] fertig: ${found}`);
  else sendLog(`» [${key}] entpackt, aber keine .exe gefunden.`);
  return found;
}

// ---------- Benchmark ----------
function parseHs(text) {
  const re = /(\d+(?:[.,]\d+)?)\s*(GH\/s|MH\/s|kH\/s|KH\/s|H\/s)/gi;
  let best = 0, m;
  while ((m = re.exec(text)) !== null) {
    const val = parseFloat(m[1].replace(',', '.'));
    const u = m[2].toUpperCase();
    const mult = u.startsWith('GH') ? 1e9 : u.startsWith('MH') ? 1e6 : u.startsWith('KH') ? 1e3 : 1;
    best = Math.max(best, val * mult);
  }
  return best;
}
function benchOne(key, algo, opts, sec) {
  return new Promise((resolve) => {
    let cmd;
    try {
      cmd = buildCmd(key, algo, { ...opts, powerPct: 100 });
    } catch (e) { resolve({ score: 0, text: 'skip: ' + e.message }); return; }
    const exe = cmd[0];
    import('fs').then(({ existsSync }) => {
      if (!existsSync(exe)) { resolve({ score: 0, text: 'exe fehlt' }); return; }
      const p = spawn(exe, cmd.slice(1), { cwd: path.dirname(exe) });
      let tail = '';
      let peak = 0;
      const timer = setTimeout(() => {
        try { p.kill(); } catch { /* noop */ }
      }, sec * 1000);
      p.stdout.on('data', (d) => {
        const s = d.toString();
        tail = (tail + s).slice(-8000);
        peak = Math.max(peak, parseHs(s));
      });
      p.stderr.on('data', (d) => {
        const s = d.toString();
        tail = (tail + s).slice(-8000);
      });
      p.on('close', () => {
        clearTimeout(timer);
        const score = parseHs(tail) || peak;
        resolve({ score, text: `${score.toLocaleString('de-DE', { maximumFractionDigits: 0 })} H/s` });
      });
      p.on('error', (e) => { clearTimeout(timer); resolve({ score: 0, text: 'start-fehler' }); });
    });
  });
}

// ---------- Fenster ----------
function createWindow() {
  win = new BrowserWindow({
    width: 1080, height: 860, backgroundColor: '#000000', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  });
  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  } else {
    win.loadURL('http://localhost:5173');
  }
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => {
  try { if (child) child.kill(); } catch { /* noop */ }
  if (process.platform !== 'darwin') app.quit();
});

// ---------- IPC ----------
ipcMain.handle('cfg:load', async () => {
  try { return JSON.parse(await fs.readFile(CONFIG_PATH(), 'utf-8')); }
  catch { return {}; }
});
ipcMain.handle('cfg:save', async (_e, data) => {
  try { await fs.writeFile(CONFIG_PATH(), JSON.stringify(data, null, 2), 'utf-8'); return true; }
  catch { return false; }
});
ipcMain.handle('miners:status', async () => {
  const out = [];
  for (const key of Object.keys(MINERS)) {
    out.push({ key, ...MINERS[key], installed: await exeExists(key), exe: minerExe(key) });
  }
  return out;
});
ipcMain.handle('miner:download', async (_e, key) => {
  try { await downloadMiner(key); return { ok: true }; }
  catch (e) { sendLog(`» [${key}] fehler: ${e.message}`); return { ok: false, error: e.message }; }
});
ipcMain.handle('miner:downloadAll', async (_e, algo) => {
  const keys = Object.keys(MINERS).filter((k) => MINERS[k].supports.includes(algo));
  for (const k of keys) {
    if (!(await exeExists(k))) {
      try { await downloadMiner(k); } catch (e) { sendLog(`» [${k}] fehler: ${e.message}`); }
    } else sendLog(`» [${k}] bereits vorhanden.`);
  }
  return { ok: true };
});
ipcMain.handle('mine:start', async (_e, o) => {
  // o: { coin, algo, wallet, pool, worker, powerPct, minerKey, ex:{enabled,target,pct,address} }
  if (child) return { ok: false, error: 'läuft bereits' };
  const { algo, wallet, pool, worker, powerPct, minerKey, ex } = o;
  if (!wallet) return { ok: false, error: 'Wallet fehlt' };
  if (!(await exeExists(minerKey))) {
    try { await downloadMiner(minerKey); } catch (e) { return { ok: false, error: 'Download fehlgeschlagen: ' + e.message }; }
  }
  sendLog('» kein OC/UV – nur Intensity.');
  const run = (w, tag) => {
    const cmd = buildCmd(minerKey, algo, { wallet: w, pool, worker, powerPct });
    spawnMiner(cmd, path.dirname(cmd[0]), tag);
  };
  if (ex && ex.enabled && ex.pct > 0 && ex.pct < 100) {
    if (!ex.address) return { ok: false, error: 'Exchange-Deposit fehlt' };
    sendLog(`» Split aktiv: ${100 - ex.pct}% eigen / ${ex.pct}% Exchange (${ex.target}) pro 60 Min.`);
    run(wallet, 'EIGEN');
    const cycle = (next) => {
      exTimer = setTimeout(() => {
        if (!child) return;
        try { child.kill(); } catch { /* noop */ }
        setTimeout(() => {
          if (next === 'exchange') {
            sendLog(`>> Wechsel → EXCHANGE (${ex.target})`);
            run(ex.address, 'EXCHANGE');
            cycle('own');
          } else {
            sendLog('>> Wechsel → EIGENE WALLET');
            run(wallet, 'EIGEN');
            cycle('exchange');
          }
        }, 3000);
      }, (next === 'exchange' ? ex.pct : 100 - ex.pct) * 60 * 1000);
    };
    // erster Wechsel nach Eigen-Anteil
    exTimer = setTimeout(() => {
      if (!child) return;
      try { child.kill(); } catch { /* noop */ }
      setTimeout(() => {
        sendLog(`>> Wechsel → EXCHANGE (${ex.target})`);
        run(ex.address, 'EXCHANGE');
        cycle('own');
      }, 3000);
    }, (100 - ex.pct) * 60 * 1000);
  } else if (ex && ex.enabled && ex.pct >= 100) {
    if (!ex.address) return { ok: false, error: 'Exchange-Deposit fehlt' };
    sendLog(`» 100% direkt auf Exchange-Deposit (${ex.target}).`);
    run(ex.address, 'EXCHANGE');
  } else {
    run(wallet, algo.toUpperCase());
  }
  return { ok: true };
});
ipcMain.handle('mine:stop', async () => {
  if (exTimer) { clearTimeout(exTimer); exTimer = null; }
  if (child) {
    try { child.kill(); } catch { /* noop */ }
    child = null;
  }
  sendStatus({ running: false });
  return { ok: true };
});
ipcMain.handle('bench:start', async (_e, o) => {
  // o: { algo, wallet, pool, worker, sec }
  if (benchRunning) return { ok: false, error: 'Benchmark läuft bereits' };
  if (child) return { ok: false, error: 'Bitte erst Stop drücken' };
  benchRunning = true;
  const keys = Object.keys(MINERS).filter((k) => MINERS[k].supports.includes(o.algo));
  const results = [];
  sendBench({ type: 'start', keys, sec: o.sec });
  for (const k of keys) {
    if (!(await exeExists(k))) {
      sendBench({ type: 'progress', key: k, text: 'lade …' });
      try { await downloadMiner(k); } catch { /* weiter, benchOne meldet exe fehlt */ }
    }
    sendBench({ type: 'progress', key: k, text: `teste ${o.sec}s …` });
    const r = await benchOne(k, o.algo, o, o.sec);
    results.push({ key: k, label: MINERS[k].label, ...r });
    sendBench({ type: 'progress', key: k, text: r.text });
  }
  benchRunning = false;
  const ranked = [...results].sort((a, b) => b.score - a.score);
  sendBench({ type: 'done', results: ranked });
  return { ok: true, results: ranked };
});
