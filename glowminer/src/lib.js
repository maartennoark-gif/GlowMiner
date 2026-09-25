// Geteilte Daten & Estimate-Logik (Renderer).
export const COINS = [
  {
    id: 'xna', name: 'Neurai', symbol: 'XNA', tag: 'XNA', woolyTag: 'xna',
    desc: 'AI-IoT Layer-1 (KawPow)',
    pools: ['stratum+tcp://pool.woolypooly.com:3128', 'stratum+tcp://xna.2miners.com:6060'],
    // WoolyPooly nutzt für SOLO denselben Port wie PPLNS
    soloPools: ['stratum+tcp://pool.woolypooly.com:3128'],
    exchangeUrl: 'https://www.mexc.com/exchange/XNA_USDT',
  },
  {
    id: 'clore', name: 'Clore.ai', symbol: 'CLORE', tag: 'CLORE', woolyTag: null,
    desc: 'AI-Compute Marktplatz (KawPow)',
    pools: ['stratum+tcp://pool.woolypooly.com:3118', 'stratum+tcp://clore.2miners.com:6060'],
    soloPools: [],
    exchangeUrl: 'https://www.mexc.com/exchange/CLORE_USDT',
  },
  {
    id: 'dynex', name: 'Dynex', symbol: 'DNX', tag: 'DNX', woolyTag: null,
    desc: 'AI-PoUW neuromorphic (DynexSolve)',
    pools: [
      'stratum+tcp://fr-dynex.miningocean.org:3332',
      'stratum+tcp://dnx.neuropool.net:2222',
      'stratum+tcp://us-east.dnx.minenow.space:18443',
    ],
    soloPools: [],
    exchangeUrl: 'https://nonkyc.io/market/DNX_USDT',
  },
  {
    id: 'xelis', name: 'Xelis', symbol: 'XEL', tag: 'XEL', woolyTag: 'xel',
    desc: 'Privacy-BlockDAG (XelisHashV3)',
    pools: [
      'stratum+tcp://pool.woolypooly.com:3150',
      'stratum+tcp://pool.eu.woolypooly.com:3150',
      'stratum+tcp://xelis.cedric-crispin.com:4404',
    ],
    soloPools: ['stratum+tcp://pool.woolypooly.com:3151'],
    exchangeUrl: 'https://www.mexc.com/exchange/XEL_USDT',
  },
];

// 7900-XTX-Referenz-Hashrates in H/s bei 100% (editierbar im UI für NVIDIA etc.)
export const DEFAULT_HASHRATE = {
  KawPow: 58e6, DynexSolve: 2500, Xelishashv3: 10500, FishHash: 67e6,
  Autolykos: 190e6, Octopus: 111e6, Etchash: 100e6, Karlsenhashv2: 67e6,
  NexaPow: 93e6, ProgPow: 56e6, Cuckaroo29: 13.5, 'KarlsenhashV2': 67e6,
};

export const EXCHANGES = {
  XNA: ['MEXC (XNA/USDT)', 'ok'], CLORE: ['MEXC / Gate (CLORE/USDT)', 'ok'],
  DNX: ['NonKYC (DNX/USDT)', 'dünn'], RVN: ['Binance / MEXC u.a.', 'ok'],
  XEL: ['MEXC / CoinEx', 'ok'], ERG: ['KuCoin / Gate u.a.', 'ok'],
  CFX: ['Binance u.a.', 'ok'], IRON: ['MEXC / Gate', 'mittel'],
  KLS: ['kaum gelistet', 'kaum verkaufbar'], PYI: ['kaum gelistet', 'kaum verkaufbar'],
  EPIC: ['NonKYC', 'dünn'], XTM: ['CoinEx / Gate', 'mittel'], ZANO: ['CoinEx / MEXC', 'ok'],
  ETC: ['Binance / Coinbase u.a.', 'ok'], ETHW: ['MEXC / Gate', 'mittel'],
  NEXA: ['MEXC / CoinEx', 'mittel'], MEWC: ['NonKYC', 'dünn'], NEOX: ['MEXC', 'mittel'],
  QUAI: ['MEXC', 'mittel'], FLUX: ['Binance u.a.', 'ok'], FIRO: ['Binance u.a.', 'ok'],
};
const MINEABLE = new Set(['XNA', 'CLORE', 'DNX', 'XEL']);

export async function fetchBtcUsd() {
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    const j = await r.json();
    return Number(j.bitcoin.usd);
  } catch { return 84000; }
}

export async function fetchWtmCoins() {
  const r = await fetch('https://whattomine.com/coins.json');
  const j = await r.json();
  return j.coins || {};
}

// Schätzt ALLE WTM-Coins mit Algo in hashrateMap. Gibt Zeilen {key,tag,name,algo,perday,usd,vol,marketCap}.
export function estimateAll(wtmCoins, hashrateMap, scale, btcUsd) {
  const rows = [];
  for (const [name, c] of Object.entries(wtmCoins)) {
    const tag = String(c.tag || '');
    const algo = String(c.algorithm || '');
    const base = hashrateMap[algo];
    if (!base) continue;
    const nethash = Number(c.nethash || 0);
    const btime = Number(c.block_time || 0);
    const reward = Number(c.block_reward || 0);
    if (!(nethash > 0) || !(btime > 0)) continue;
    const userHs = base * scale;
    const perday = (userHs / nethash) * (86400 / btime) * reward;
    const usd = perday * Number(c.exchange_rate || 0) * btcUsd;
    const vol = Number(c.exchange_rate_vol || 0) * btcUsd;
    const [venue] = EXCHANGES[tag] || ['–', ''];
    rows.push({
      key: `${tag}|${name}`, tag, name, algo, perday, usd, vol,
      marketCap: c.market_cap || '–', exchange: venue,
      mineable: MINEABLE.has(tag),
    });
  }
  // CLORE steht nicht auf WTM → Info-Zeile
  rows.push({
    key: 'CLORE|Clore.ai', tag: 'CLORE', name: 'Clore.ai', algo: 'KawPow',
    perday: null, usd: null, vol: null, marketCap: '–',
    exchange: EXCHANGES.CLORE[0], mineable: true, infoOnly: true,
  });
  rows.sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1));
  return rows;
}

export function fmt(n, digits = 0) {
  if (n == null || Number.isNaN(n)) return '–';
  return n.toLocaleString('de-DE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
