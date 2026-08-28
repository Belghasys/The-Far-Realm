/**
 * Liste d'IP Paddle sur le webhook (functions/paddleIps.js) : la barrière de
 * plus devant la signature. Ce qui casserait en silence : un /32 mal comparé
 * (tout refusé → plus aucun plan écrit), ou une liste vide qui bloque tout.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { ipInCidrs, clientIp } = require('../functions/paddleIps.js');

describe('ipInCidrs', () => {
    const cidrs = ['34.237.3.244/32', '34.195.105.136/32', '10.0.0.0/8'];
    it('accepte une IP exactement listée en /32', () => {
        expect(ipInCidrs('34.237.3.244', cidrs)).toBe(true);
        expect(ipInCidrs('34.195.105.136', cidrs)).toBe(true);
    });
    it('refuse une IP voisine', () => {
        expect(ipInCidrs('34.237.3.245', cidrs)).toBe(false);
        expect(ipInCidrs('1.2.3.4', cidrs)).toBe(false);
    });
    it('respecte un masque plus large', () => {
        expect(ipInCidrs('10.200.1.1', cidrs)).toBe(true);
        expect(ipInCidrs('11.0.0.1', cidrs)).toBe(false);
    });
    it('refuse ce qui n\'est pas une ipv4 propre', () => {
        expect(ipInCidrs('', cidrs)).toBe(false);
        expect(ipInCidrs('::1', cidrs)).toBe(false);
        expect(ipInCidrs('999.1.1.1', cidrs)).toBe(false);
    });
});

describe('clientIp', () => {
    it('prend le premier saut de x-forwarded-for (Cloud Run)', () => {
        const req: any = { get: (h: string) => h === 'x-forwarded-for' ? '34.237.3.244, 169.254.1.1' : '', ip: '169.254.1.1' };
        expect(clientIp(req)).toBe('34.237.3.244');
    });
    it('retombe sur req.ip sans en-tête', () => {
        const req: any = { get: () => '', ip: '5.6.7.8' };
        expect(clientIp(req)).toBe('5.6.7.8');
    });
});
