import {createHash} from 'node:crypto';
export function hash(value) { return createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex'); }
