/**
 * Transport Module
 * 
 * Abstracts the transport layer to support:
 * - HTTP over TCP
 * - WebSocket over TCP
 * - Future: TLS/SSL
 * 
 * @module jsurl/transport
 */

import * as tcp from './tcp.js';

export { tcp };
export * from './tcp.js';
