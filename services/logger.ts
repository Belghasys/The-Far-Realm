/**
 * Conditional logger — only outputs in development mode.
 * Errors are always shown regardless of environment.
 * Import: import { log } from './logger';
 */

const isDev = import.meta.env.DEV;

type LogArgs = unknown[];

export const log = {
    /** Dev-only info/general messages */
    info: (...args: LogArgs): void => {
        if (isDev) console.log(...args);
    },
    /** Dev-only warning */
    warn: (...args: LogArgs): void => {
        if (isDev) console.warn(...args);
    },
    /** Always visible — use for real errors */
    error: (...args: LogArgs): void => {
        console.error(...args);
    },
    /** Dev-only verbose debug (very noisy) */
    debug: (...args: LogArgs): void => {
        if (isDev) console.debug('[DBG]', ...args);
    },
};
