// Electron main process for DnD: The Far Realm.
//
// On launch it: reads the installed runtime config, spawns the two Python media
// servers (image :8000, audio :8001) from the installed venv, serves the built
// React client over local HTTP, injects the per-player config into the renderer,
// and tears the Python servers down on exit.
//
// Install layout (set by the Inno installer): the packaged exe lives in
// <root>/app/, so the install root is two levels up from process.execPath.
// Override with DND_ROOT / DND_CLIENT_DIR for `npm start` development.
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const { serveClient } = require('./static-server');

const ROOT = process.env.DND_ROOT || path.resolve(path.dirname(process.execPath), '..');
const CONFIG_DIR = path.join(ROOT, 'config');
const SERVERS_DIR = path.join(ROOT, 'servers');
const VENV_PY = path.join(ROOT, 'runtime', 'venv', 'Scripts', 'python.exe');
const CLIENT_DIR = process.env.DND_CLIENT_DIR || path.join(process.resourcesPath || ROOT, 'client');

// VITE_* keys are forwarded to the renderer; everything else drives the servers.
const VITE_PREFIX = 'VITE_';

let mainWindow = null;
let staticServer = null;
const children = [];

function parseEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

function splitConfig(env) {
  const renderer = {};
  const engine = {};
  for (const [k, v] of Object.entries(env)) {
    if (k.startsWith(VITE_PREFIX)) renderer[k] = v;
    else engine[k] = v;
  }
  return { renderer, engine };
}

function spawnServer(label, script, engineEnv) {
  if (!fs.existsSync(VENV_PY)) {
    console.warn(`[launcher] venv python missing (${VENV_PY}); skipping ${label}. Game falls back to Gemini.`);
    return;
  }
  const scriptPath = path.join(SERVERS_DIR, script);
  if (!fs.existsSync(scriptPath)) {
    console.warn(`[launcher] ${scriptPath} missing; skipping ${label}.`);
    return;
  }
  const child = spawn(VENV_PY, [scriptPath], {
    cwd: SERVERS_DIR,
    env: { ...process.env, ...engineEnv },
    windowsHide: true,
  });
  child.stdout.on('data', (d) => process.stdout.write(`[${label}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${label}] ${d}`));
  child.on('exit', (code) => console.log(`[launcher] ${label} exited (${code}).`));
  children.push(child);
}

function killChildren() {
  for (const child of children) {
    if (child.pid && !child.killed) {
      // Kill the whole tree — uvicorn/torch can spawn workers.
      try {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
      } catch (e) {
        try { child.kill(); } catch (_) { /* ignore */ }
      }
    }
  }
}

// Resolve a server's /health (any HTTP response counts as "up"); never rejects.
function ping(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/health', timeout: 1500 }, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function logHealthWhenReady() {
  // Best-effort: the client tolerates servers that aren't up yet (Gemini fallback),
  // so we don't block the window on this — just log once they answer.
  for (const [label, port] of [['image', 8000], ['audio', 8001]]) {
    (async () => {
      for (let i = 0; i < 120; i++) {
        if (await ping(port)) { console.log(`[launcher] ${label} server is up on :${port}.`); return; }
        await new Promise((r) => setTimeout(r, 2000));
      }
    })();
  }
}

async function createWindow() {
  const env = parseEnvFile(path.join(CONFIG_DIR, 'runtime.env'));
  const { renderer, engine } = splitConfig(env);
  const setupComplete = fs.existsSync(path.join(CONFIG_DIR, '.setup-complete'));

  // Start the media servers (non-blocking; they warm models in the background).
  spawnServer('flux', 'flux_server.py', engine);
  spawnServer('audio', 'audio_server.py', engine);
  logHealthWhenReady();

  // Serve the built client over local HTTP (BrowserRouter needs real routes).
  const { server, port } = await serveClient(CLIENT_DIR);
  staticServer = server;

  const cfgArg = '--dnd-config=' + Buffer.from(JSON.stringify(renderer), 'utf8').toString('base64');
  mainWindow = new BrowserWindow({
    width: 1480,
    height: 900,
    backgroundColor: '#0a0a0f',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      additionalArguments: [cfgArg],
    },
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());

  await mainWindow.loadFile(path.join(__dirname, 'loading.html'));
  if (!setupComplete) {
    mainWindow.webContents.executeJavaScript(
      `window.__DND_SET_STATUS && window.__DND_SET_STATUS("Configuration incomplète — lancez \\"Repair / Setup\\" depuis le menu Démarrer.");`
    ).catch(() => {});
  }

  // Give the loading splash a beat, then load the game.
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL(`http://127.0.0.1:${port}/`);
    }
  }, 1200);

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  killChildren();
  if (staticServer) staticServer.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', killChildren);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
