/**
 * jsurl - HTTP Request Tool
 * 
 * A raw socket HTTP/WebSocket client for Node.js.
 * Uses only Node.js internal modules - no external dependencies.
 * 
 * @module jsurl
 */

import { createRequire } from 'module';

// Read version from package.json
const require = createRequire(import.meta.url);
const pkg = require('../package.json');

/**
 * Library version (synced from package.json)
 */
export const VERSION = pkg.version;

// Re-export all modules
export * from './utils/index.js';
export * from './cli/index.js';
export * from './http/index.js';
export * from './cookies/index.js';
export * from './transport/index.js';

// WebSocket as separate namespace
import * as websocket from './websocket/index.js';
export { websocket };
