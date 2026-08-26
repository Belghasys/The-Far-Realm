/**
 * gpuLock.ts
 * Coordinates the single local GPU shared by the three generators:
 *   - image (FLUX, :8000)
 *   - sfx   (AudioLDM / Stable Audio, :8001)
 *   - music (MusicGen / Stable Audio, :8001)
 *
 * Requested guarantee: MUSIC must NEVER generate at the same time as image or
 * sfx — that is the combination that would blow past the 16GB VRAM budget.
 * Image and sfx MAY overlap (FLUX ~10GB + a small sfx model ~2GB still fits),
 * so we don't needlessly serialize the frequent, latency-sensitive combat SFX.
 *
 * This is a writer-preference readers/writer lock:
 *   - music  = exclusive "writer": runs alone; blocks all image/sfx.
 *   - image + sfx = shared "readers": run together, but never while music runs
 *     or is waiting (writer-preference prevents music from starving).
 *
 * A per-holder watchdog force-releases the lock if a generation hangs, so a
 * stuck server can never permanently freeze all media.
 */

import { log } from './infra/logger';

const WATCHDOG_MS = 200_000; // safety net: force-release a hung holder

type Resolver = () => void;

let activeReaders = 0;       // image+sfx generations currently running
let musicActive = false;     // a music generation is running
let waitingWriters = 0;      // music generations waiting their turn
const readerQueue: Resolver[] = [];
const writerQueue: Resolver[] = [];

function canReaderProceed(): boolean {
    // Readers wait while music runs OR while music is queued (writer-preference).
    return !musicActive && waitingWriters === 0;
}

function canWriterProceed(): boolean {
    return !musicActive && activeReaders === 0;
}

function drain(): void {
    // Let a waiting writer (music) go first whenever possible.
    if (writerQueue.length && canWriterProceed()) {
        musicActive = true;
        waitingWriters--;
        writerQueue.shift()!();
        return;
    }
    // Otherwise release every reader that can currently proceed.
    while (readerQueue.length && canReaderProceed()) {
        activeReaders++;
        readerQueue.shift()!();
    }
}

function acquireReader(): Promise<void> {
    if (canReaderProceed()) {
        activeReaders++;
        return Promise.resolve();
    }
    return new Promise<void>(resolve => readerQueue.push(resolve));
}

function releaseReader(): void {
    activeReaders = Math.max(0, activeReaders - 1);
    drain();
}

function acquireWriter(): Promise<void> {
    if (canWriterProceed()) {
        musicActive = true;
        return Promise.resolve();
    }
    waitingWriters++;
    return new Promise<void>(resolve => writerQueue.push(resolve));
}

function releaseWriter(): void {
    musicActive = false;
    drain();
}

async function runWithWatchdog<T>(label: string, release: () => void, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    let released = false;
    const releaseOnce = () => { if (!released) { released = true; release(); } };
    // The watchdog now ABORTS the underlying generation, not just the lock.
    // Releasing the lock alone let a hung holder keep running (and keep holding
    // VRAM) while the next holder started — defeating the lock's whole purpose
    // (music overlapping a stuck image). Aborting the fetch frees the GPU before
    // the lock is handed on. Callers that ignore the signal still benefit from
    // the lock release; those that forward it to fetch() get true cancellation.
    const controller = new AbortController();
    const watchdog = setTimeout(() => {
        log.warn(`⚠️ gpuLock watchdog force-released & aborted "${label}" after ${WATCHDOG_MS}ms`);
        try { controller.abort(); } catch { /* ignore */ }
        releaseOnce();
    }, WATCHDOG_MS);
    try {
        return await fn(controller.signal);
    } finally {
        clearTimeout(watchdog);
        releaseOnce();
    }
}

/**
 * Run a GPU image/sfx generation. May overlap other image/sfx work, but never
 * runs while music is generating or waiting. The callback receives an AbortSignal
 * that fires if the watchdog force-releases a hung generation — forward it to
 * fetch() so a stuck server request is actually cancelled.
 */
export async function withImageSfxGpu<T>(label: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    await acquireReader();
    return runWithWatchdog(label, releaseReader, fn);
}

/**
 * Run a GPU music generation. Runs ALONE — no image or sfx generation overlaps.
 * The callback receives an AbortSignal (see withImageSfxGpu).
 */
export async function withMusicGpu<T>(label: string, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
    await acquireWriter();
    return runWithWatchdog(label, releaseWriter, fn);
}

/** Test/diagnostic snapshot of the lock state. */
export function gpuLockState(): { activeReaders: number; musicActive: boolean; waitingWriters: number; readerQueue: number; writerQueue: number } {
    return { activeReaders, musicActive, waitingWriters, readerQueue: readerQueue.length, writerQueue: writerQueue.length };
}
