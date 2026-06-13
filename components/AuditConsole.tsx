import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { auditBus, AuditEntry, AuditChannel, AUDIT_CHANNELS, AUDIT_CHANNEL_LABEL } from '../services/auditBus';
import { useGameStore } from '../store/gameStore';

const CHANNEL_COLOR: Record<AuditChannel, string> = {
  'gemini-system': '#a78bfa',
  'gemini-out': '#38bdf8',
  'gemini-in': '#34d399',
  'gemini-tool': '#fbbf24',
  'image': '#f472b6',
  'sfx': '#fb923c',
  'music': '#22d3ee',
  'combat': '#f87171',
  'engine': '#9ca3af',
};

const fmtTime = (ts: number) => {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/**
 * The audit console view. Rendered INSIDE the separate OS window (via AuditWindow's
 * portal), but it lives in the main React tree, so useGameStore / auditBus work
 * exactly as in-app. Pure observability + the dev-mode toggle.
 */
function AuditConsoleView() {
  const [entries, setEntries] = useState<AuditEntry[]>(() => auditBus.getAll());
  const [active, setActive] = useState<Set<AuditChannel>>(() => new Set(AUDIT_CHANNELS));
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState('');
  const devMode = useGameStore(s => s.devMode);
  const setDevMode = useGameStore(s => s.setDevMode);
  const listRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => auditBus.subscribe((entry) => {
    // While paused, freeze the displayed feed (the entry is still recorded in
    // auditBus, so resuming catches up). Previously pause only stopped auto-scroll
    // and new lines kept streaming in — the button looked inoperative.
    if (pausedRef.current) return;
    setEntries(prev => {
      const next = [...prev, entry];
      return next.length > 600 ? next.slice(-600) : next;
    });
  }), []);

  useEffect(() => {
    if (!pausedRef.current && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [entries]);

  const toggleChannel = (c: AuditChannel) => setActive(prev => {
    const n = new Set(prev);
    if (n.has(c)) n.delete(c); else n.add(c);
    return n;
  });

  const q = query.trim().toLowerCase();
  const filtered = entries.filter(e =>
    active.has(e.channel) && (!q || `${e.title} ${e.detail || ''}`.toLowerCase().includes(q)));

  return (
    <div className="flex h-screen flex-col bg-zinc-950 font-mono text-xs text-zinc-100">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-black/60 p-2">
        <span className="font-bold text-amber-300">🔍 AUDIT CONSOLE</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="filtrer le texte…"
          className="min-w-[140px] flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white outline-none placeholder:text-white/30"
        />
        <button onClick={() => setPaused(p => { const next = !p; if (!next) setEntries(auditBus.getAll().slice(-600)); return next; })} className={`rounded px-2 py-1 ${paused ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/80'}`}>
          {paused ? '▶ reprendre' : '⏸ pause'}
        </button>
        <button onClick={() => { auditBus.clear(); setEntries([]); setSelected(null); }} className="rounded bg-white/10 px-2 py-1 text-white/80">vider</button>
        <button onClick={() => setDevMode(!devMode)} className={`rounded px-2 py-1 font-bold ${devMode ? 'bg-red-600 text-white' : 'bg-white/10 text-white/80'}`}>
          🛠 Mode Dév : {devMode ? 'ON' : 'OFF'}
        </button>
        <span className="ml-auto text-white/40">{filtered.length}/{entries.length}</span>
      </div>

      {/* Channel filters */}
      <div className="flex flex-wrap gap-1 border-b border-white/10 bg-black/40 p-1.5">
        {AUDIT_CHANNELS.map(c => (
          <button
            key={c}
            onClick={() => toggleChannel(c)}
            style={{ borderColor: active.has(c) ? CHANNEL_COLOR[c] : 'transparent', color: active.has(c) ? CHANNEL_COLOR[c] : undefined }}
            className={`rounded border px-2 py-0.5 text-[10px] font-bold ${active.has(c) ? 'bg-white/10' : 'bg-transparent text-white/25'}`}
          >
            {AUDIT_CHANNEL_LABEL[c]}
          </button>
        ))}
      </div>

      {/* List + detail */}
      <div className="flex min-h-0 flex-1">
        <div ref={listRef} className="w-1/2 overflow-y-auto border-r border-white/10">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-white/30">Aucune entrée. Joue, parle au MJ, déclenche une image/son… tout apparaît ici en direct.</div>
          ) : filtered.map(e => (
            <button
              key={e.id}
              onClick={() => setSelected(e)}
              className={`flex w-full items-baseline gap-2 border-b border-white/5 px-2 py-1 text-left hover:bg-white/5 ${selected?.id === e.id ? 'bg-white/10' : ''}`}
            >
              <span className="shrink-0 text-white/30">{fmtTime(e.ts)}</span>
              <span style={{ color: CHANNEL_COLOR[e.channel] }} className="w-20 shrink-0 font-bold">{AUDIT_CHANNEL_LABEL[e.channel]}</span>
              <span className="truncate text-white/80">{e.title}</span>
            </button>
          ))}
        </div>
        <div className="flex w-1/2 flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-2 py-1">
                <span style={{ color: CHANNEL_COLOR[selected.channel] }} className="font-bold">{AUDIT_CHANNEL_LABEL[selected.channel]} — {fmtTime(selected.ts)}</span>
                <button
                  onClick={() => { try { navigator.clipboard?.writeText(selected.detail || selected.title); } catch { /* ignore */ } }}
                  className="rounded bg-white/10 px-2 py-0.5 text-white/80"
                >copier</button>
              </div>
              <div className="border-b border-white/5 px-2 py-1 text-white/60">{selected.title}</div>
              <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-2 text-[11px] leading-relaxed text-white/80">{selected.detail || '(pas de détail)'}</pre>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-white/30">Sélectionne une entrée pour voir le détail complet (prompt, args, réponse…).</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Opens the audit console in a REAL separate OS window (window.open) and portals
 * the React view into it. The opener's stylesheets are cloned so Tailwind classes
 * render identically. Closing either window cleans up the other.
 */
export function AuditWindow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  // Keep onClose in a ref so the effect depends ONLY on `open` — otherwise a new
  // onClose identity each parent render would tear down & reopen the window.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const win = window.open('', 'dungeonai_audit', 'width=980,height=780,menubar=no,toolbar=no,location=no');
    if (!win) {
      // Popup blocked.
      onCloseRef.current();
      try { alert("La fenêtre d'audit a été bloquée par le navigateur. Autorise les pop-ups pour ce site, puis réessaie."); } catch { /* ignore */ }
      return;
    }
    win.document.title = "DungeonAI — Console d'audit";
    // Clone stylesheets so Tailwind utilities render in the popup. Use the resolved
    // absolute href for <link> (about:blank has no usable base URL otherwise).
    document.querySelectorAll('link[rel="stylesheet"]').forEach(node => {
      const link = win.document.createElement('link');
      link.rel = 'stylesheet';
      link.href = (node as HTMLLinkElement).href;
      win.document.head.appendChild(link);
    });
    document.querySelectorAll('style').forEach(node => {
      win.document.head.appendChild(node.cloneNode(true));
    });
    win.document.body.style.margin = '0';
    win.document.body.style.background = '#09090b';
    const div = win.document.createElement('div');
    win.document.body.appendChild(div);
    setContainer(div);

    const handleClose = () => onCloseRef.current();
    win.addEventListener('beforeunload', handleClose);
    const poll = win.setInterval(() => { if (win.closed) onCloseRef.current(); }, 1000);

    return () => {
      try { win.clearInterval(poll); } catch { /* ignore */ }
      try { win.removeEventListener('beforeunload', handleClose); } catch { /* ignore */ }
      setContainer(null);
      try { win.close(); } catch { /* ignore */ }
    };
  }, [open]);

  if (!open || !container) return null;
  return createPortal(<AuditConsoleView />, container);
}
