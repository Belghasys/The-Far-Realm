// Exposes the per-player runtime config (Gemini key, model names, local server
// URLs) to the game UI as window.__DND_RUNTIME__. modelConfig.ts reads this first,
// which is how each install uses its OWN key instead of one baked into the Vite build.
const { contextBridge } = require('electron');

const PREFIX = '--dnd-config=';
let cfg = {};
const arg = process.argv.find((a) => a.startsWith(PREFIX));
if (arg) {
  try {
    cfg = JSON.parse(Buffer.from(arg.slice(PREFIX.length), 'base64').toString('utf8'));
  } catch (e) {
    console.error('Failed to parse runtime config:', e);
  }
}

contextBridge.exposeInMainWorld('__DND_RUNTIME__', cfg);
