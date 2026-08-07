// Stockfish 18 (lite) UCI wrapper. Runs entirely in the user's browser via a Web
// Worker -> zero server cost. Uses the multi-threaded build when the page is
// cross-origin isolated (SharedArrayBuffer available), else the single-threaded one.
// Engine is GPLv3 (c) Chess.com / nmrugg stockfish.js. See public/engine + LICENSE.

const MULTI_THREAD =
  typeof SharedArrayBuffer !== 'undefined' && typeof self !== 'undefined' && self.crossOriginIsolated;
const ENGINE_URL = MULTI_THREAD ? '/engine/stockfish-18-lite.js' : '/engine/stockfish-18-lite-single.js';
const THREADS = MULTI_THREAD
  ? Math.max(2, Math.min(8, (navigator.hardwareConcurrency || 4) - 1))
  : 1;

export class Engine {
  constructor() {
    this.worker = null;
    this.ready = false;
    this._listeners = [];
    this._initPromise = null;
    this._chain = Promise.resolve(); // serializes analyze() calls on the single worker
  }

  _onLine(line) {
    for (const l of this._listeners) l(line);
  }

  init() {
    if (this._initPromise) return this._initPromise;
    this._initPromise = new Promise((resolve, reject) => {
      try {
        this.worker = new Worker(ENGINE_URL);
      } catch (e) {
        reject(e);
        return;
      }
      this.worker.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
        this._onLine(line);
      };
      this.worker.onerror = (e) => reject(new Error('Engine worker error: ' + (e.message || e)));

      const waitUci = (line) => {
        if (line.startsWith('uciok')) {
          off(waitUci);
          if (THREADS > 1) this.setOption('Threads', THREADS);
          this.send('isready');
          on(waitReady);
        }
      };
      const waitReady = (line) => {
        if (line.startsWith('readyok')) {
          off(waitReady);
          this.ready = true;
          resolve();
        }
      };
      const on = (fn) => this._listeners.push(fn);
      const off = (fn) => {
        this._listeners = this._listeners.filter((x) => x !== fn);
      };

      on(waitUci);
      this.send('uci');
    });
    return this._initPromise;
  }

  send(cmd) {
    if (this.worker) this.worker.postMessage(cmd);
  }

  setOption(name, value) {
    this.send(`setoption name ${name} value ${value}`);
  }

  // Analyze one position. Resolves with { bestmove, lines: [{multipv, cp, mate, pv}] }.
  // Calls are serialized so overlapping requests never corrupt the UCI stream.
  analyze(fen, opts = {}) {
    const run = () => this._analyzeNow(fen, opts);
    const next = this._chain.then(run, run);
    this._chain = next.catch(() => {});
    return next;
  }

  // Scores are from the side-to-move's perspective (UCI standard).
  _analyzeNow(fen, { depth = 12, multipv = 1 } = {}) {
    return new Promise((resolve) => {
      const infoByPv = new Map();

      const handler = (line) => {
        if (line.startsWith('info') && line.includes(' pv ')) {
          const info = parseInfo(line);
          if (info) infoByPv.set(info.multipv, info);
        } else if (line.startsWith('bestmove')) {
          this._listeners = this._listeners.filter((x) => x !== handler);
          const bestmove = line.split(/\s+/)[1];
          const lines = [...infoByPv.values()].sort((a, b) => a.multipv - b.multipv);
          resolve({ bestmove, lines });
        }
      };

      this._listeners.push(handler);
      this.setOption('MultiPV', multipv);
      this.send('position fen ' + fen);
      this.send('go depth ' + depth);
    });
  }

  stop() {
    this.send('stop');
  }

  quit() {
    this.send('quit');
    if (this.worker) this.worker.terminate();
    this.worker = null;
    this.ready = false;
    this._initPromise = null;
  }
}

function parseInfo(line) {
  const t = line.split(/\s+/);
  const info = { multipv: 1, cp: null, mate: null, depth: 0, pv: [] };
  for (let i = 0; i < t.length; i++) {
    switch (t[i]) {
      case 'depth':
        info.depth = parseInt(t[++i], 10);
        break;
      case 'multipv':
        info.multipv = parseInt(t[++i], 10);
        break;
      case 'score':
        if (t[i + 1] === 'cp') {
          info.cp = parseInt(t[i + 2], 10);
          i += 2;
        } else if (t[i + 1] === 'mate') {
          info.mate = parseInt(t[i + 2], 10);
          i += 2;
        }
        break;
      case 'pv':
        info.pv = t.slice(i + 1);
        i = t.length;
        break;
      default:
        break;
    }
  }
  return info;
}
