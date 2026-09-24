// GlowMiner preload (CommonJS, contextIsolation-safe).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  cfgLoad: () => ipcRenderer.invoke('cfg:load'),
  cfgSave: (data) => ipcRenderer.invoke('cfg:save', data),
  minersStatus: () => ipcRenderer.invoke('miners:status'),
  minerDownload: (key) => ipcRenderer.invoke('miner:download', key),
  minerDownloadAll: (algo) => ipcRenderer.invoke('miner:downloadAll', algo),
  mineStart: (opts) => ipcRenderer.invoke('mine:start', opts),
  mineStop: () => ipcRenderer.invoke('mine:stop'),
  benchStart: (opts) => ipcRenderer.invoke('bench:start', opts),
  onLog: (cb) => ipcRenderer.on('mine:log', (_e, line) => cb(line)),
  onStatus: (cb) => ipcRenderer.on('mine:status', (_e, s) => cb(s)),
  onBench: (cb) => ipcRenderer.on('bench:update', (_e, m) => cb(m)),
});
