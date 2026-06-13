// Lightweight global AUDIT BUS.
//
// A non-React singleton so plain service modules (geminiRealtime, image/sfx/music)
// can publish without importing React. The AuditConsole window subscribes to it to
// render a live, filterable feed of EVERYTHING we send to / receive from the models:
// the Gemini Live system instruction, every outbound/inbound message, tool calls,
// and the image / SFX / music prompts. Pure observability — it never changes game state.

export type AuditChannel =
  | 'gemini-system'   // the Live system instruction sent at connect
  | 'gemini-out'      // outbound user/system messages to Gemini Live
  | 'gemini-in'       // inbound DM transcript from Gemini Live
  | 'gemini-tool'     // tool calls the DM invoked (+ our responses)
  | 'image'           // image-generation prompts
  | 'sfx'             // SFX-generation prompts (AudioLDM / Stable Audio)
  | 'music'           // music mood / prompt
  | 'combat'          // engine combat rolls (player + enemy)
  | 'engine';         // misc engine / state events

export const AUDIT_CHANNELS: AuditChannel[] = [
  'gemini-system', 'gemini-out', 'gemini-in', 'gemini-tool', 'image', 'sfx', 'music', 'combat', 'engine',
];

export const AUDIT_CHANNEL_LABEL: Record<AuditChannel, string> = {
  'gemini-system': 'System prompt',
  'gemini-out': 'Gemini ←',
  'gemini-in': 'Gemini →',
  'gemini-tool': 'Tool calls',
  'image': 'Image',
  'sfx': 'SFX',
  'music': 'Musique',
  'combat': 'Combat',
  'engine': 'Moteur',
};

export interface AuditEntry {
  id: number;
  ts: number;          // epoch ms
  channel: AuditChannel;
  title: string;       // one-line summary
  detail?: string;     // full payload (prompt text, JSON, …)
}

type Listener = (entry: AuditEntry) => void;

const MAX_ENTRIES = 600;
let counter = 0;
const entries: AuditEntry[] = [];
const listeners = new Set<Listener>();

function stringify(detail: unknown): string | undefined {
  if (detail == null) return undefined;
  if (typeof detail === 'string') return detail;
  try { return JSON.stringify(detail, null, 2); } catch { return String(detail); }
}

export const auditBus = {
  publish(channel: AuditChannel, title: string, detail?: unknown): void {
    const entry: AuditEntry = { id: ++counter, ts: Date.now(), channel, title: String(title), detail: stringify(detail) };
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
    listeners.forEach(l => { try { l(entry); } catch { /* a broken listener must not break publishing */ } });
  },
  subscribe(cb: Listener): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  },
  getAll(): AuditEntry[] { return entries.slice(); },
  clear(): void { entries.length = 0; },
};
