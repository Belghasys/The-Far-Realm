/**
 * Illustrated chronicle — persists every generated scene image locally
 * (IndexedDB) so the campaign keeps a browsable gallery instead of losing each
 * background when the next one replaces it. Feeds the Journal's "Galerie" tab
 * and the HTML campaign export. Local-only by design: data URLs never go to
 * Firestore (1 MiB doc cap).
 */
import { log } from './logger';

const DB_NAME = 'dungeonai_gallery';
const DB_VERSION = 1;
const STORE = 'scenes';
/** Kept per save — oldest pruned beyond this. */
const MAX_PER_SAVE = 80;

export interface GalleryImage {
    id: string;
    saveId: string;
    dataUrl: string;
    prompt: string;
    summary: string;
    phase: string;
    createdAt: number;
}

function openDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: 'id' });
                store.createIndex('bySave', 'saveId', { unique: false });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
}

class GalleryService {
    async addImage(image: Omit<GalleryImage, 'id' | 'createdAt'>): Promise<void> {
        const db = await openDb();
        if (!db) return;
        const record: GalleryImage = {
            ...image,
            id: `scene_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            createdAt: Date.now(),
        };
        await new Promise<void>((resolve) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(record);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
        void this.prune(db, image.saveId).finally(() => db.close());
    }

    private async prune(db: IDBDatabase, saveId: string): Promise<void> {
        const all = await this.readAll(db, saveId);
        if (all.length <= MAX_PER_SAVE) return;
        const excess = all
            .sort((a, b) => a.createdAt - b.createdAt)
            .slice(0, all.length - MAX_PER_SAVE);
        await new Promise<void>((resolve) => {
            const tx = db.transaction(STORE, 'readwrite');
            const store = tx.objectStore(STORE);
            excess.forEach(image => store.delete(image.id));
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        });
        log.info(`🖼️ Gallery pruned: ${excess.length} old scene(s) removed`);
    }

    private readAll(db: IDBDatabase, saveId: string): Promise<GalleryImage[]> {
        return new Promise((resolve) => {
            const tx = db.transaction(STORE, 'readonly');
            const index = tx.objectStore(STORE).index('bySave');
            const request = index.getAll(saveId);
            request.onsuccess = () => resolve((request.result as GalleryImage[]) || []);
            request.onerror = () => resolve([]);
        });
    }

    /** Newest first. */
    async listImages(saveId: string): Promise<GalleryImage[]> {
        const db = await openDb();
        if (!db) return [];
        const all = await this.readAll(db, saveId);
        db.close();
        return all.sort((a, b) => b.createdAt - a.createdAt);
    }
}

export const galleryService = new GalleryService();

// ─── HTML campaign export ────────────────────────────────────────────────────

export interface ChronicleExportInput {
    title: string;
    heroLine: string;
    dayLine?: string;
    prologue?: string;
    chronicle: { title: string; description: string; timestamp: number }[];
    images: GalleryImage[];
    language: 'en' | 'fr';
}

const esc = (s: string) => String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Build a fully self-contained HTML "souvenir de campagne" (images inlined). */
export function buildChronicleHtml(input: ChronicleExportInput): string {
    const fr = input.language === 'fr';
    const chronicleHtml = input.chronicle.map(entry => `
      <article class="beat">
        <h3>${esc(entry.title)}</h3>
        <p>${esc(entry.description)}</p>
        <time>${new Date(entry.timestamp).toLocaleString(fr ? 'fr-FR' : 'en-US')}</time>
      </article>`).join('\n');
    const galleryHtml = [...input.images].reverse().map(image => `
      <figure>
        <img src="${image.dataUrl}" alt="${esc(image.summary)}" loading="lazy" />
        <figcaption>${esc(image.summary || image.phase)}</figcaption>
      </figure>`).join('\n');

    return `<!DOCTYPE html>
<html lang="${fr ? 'fr' : 'en'}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(input.title)}</title>
<style>
  body { margin: 0; background: #0c0a09; color: #e7e5e4; font-family: Georgia, 'Times New Roman', serif; line-height: 1.6; }
  main { max-width: 900px; margin: 0 auto; padding: 40px 20px 80px; }
  h1 { font-size: 2.2rem; color: #fbbf24; margin-bottom: 4px; }
  .hero { color: #a8a29e; margin-bottom: 2px; }
  .day { color: #78716c; font-size: .9rem; margin-bottom: 28px; }
  section h2 { color: #fbbf24; border-bottom: 1px solid #44403c; padding-bottom: 8px; margin-top: 44px; }
  .prologue { white-space: pre-wrap; background: #1c1917; border: 1px solid #44403c; border-radius: 8px; padding: 18px 22px; }
  .beat { background: #1c1917; border: 1px solid #3f3a36; border-radius: 8px; padding: 14px 18px; margin: 12px 0; }
  .beat h3 { margin: 0 0 6px; color: #d6d3d1; }
  .beat p { margin: 0 0 8px; color: #a8a29e; }
  .beat time { font-size: .78rem; color: #57534e; }
  .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
  figure { margin: 0; background: #1c1917; border: 1px solid #3f3a36; border-radius: 8px; overflow: hidden; }
  figure img { display: block; width: 100%; height: auto; }
  figcaption { padding: 8px 12px; font-size: .8rem; color: #a8a29e; }
</style>
</head>
<body>
<main>
  <h1>${esc(input.title)}</h1>
  <p class="hero">${esc(input.heroLine)}</p>
  ${input.dayLine ? `<p class="day">${esc(input.dayLine)}</p>` : ''}
  ${input.prologue ? `<section><h2>${fr ? 'Prologue' : 'Prologue'}</h2><div class="prologue">${esc(input.prologue)}</div></section>` : ''}
  <section><h2>${fr ? 'Chronique' : 'Chronicle'}</h2>${chronicleHtml || `<p>${fr ? 'Aucune entrée.' : 'No entries.'}</p>`}</section>
  <section><h2>${fr ? 'Galerie' : 'Gallery'}</h2><div class="gallery">${galleryHtml || `<p>${fr ? 'Aucune image.' : 'No images.'}</p>`}</div></section>
</main>
</body>
</html>`;
}
