/**
 * Help message generation
 */

import { colors } from '../utils/colors.js';
import { options } from './options.js';
import { createRequire } from 'module';

// Read package.json in ESM
const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

/**
 * Generate help message
 * @returns {string}
 */
export function generateHelp() {
    const c = colors;
    
    // Group options by category
    const categories = {
        request: { title: 'Request', items: [] },
        headers: { title: 'Headers', items: [] },
        cookies: { title: 'Cookies', items: [] },
        proxy: { title: 'Proxy', items: [] },
        connection: { title: 'Connection', items: [] },
        websocket: { title: 'WebSocket', items: [] },
        output: { title: 'Output', items: [] },
        info: { title: 'Info', items: [] },
    };
    
    for (const [key, def] of Object.entries(options)) {
        const category = def.category || 'other';
        if (categories[category]) {
            categories[category].items.push({ key, ...def });
        }
    }
    
    // Generate help text
    let help = `
${c.cyan}╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ${c.bold}jsurl${c.reset}${c.cyan} - HTTP/WebSocket Request Tool                         ║
║   v${pkg.version}                                                        ║
║                                                               ║
║   ${c.gray}HTTP • WebSocket • Proxy • Raw Sockets${c.reset}${c.cyan}                     ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝${c.reset}

${c.yellow}USAGE:${c.reset}
  ${c.gray}# HTTP${c.reset}
  jsurl -u <url> [options]
  jsurl <url> [proxy] [port]

  ${c.gray}# WebSocket${c.reset}
  jsurl -u ws://<host>/<path> -m "message"

${c.yellow}OPTIONS:${c.reset} ${c.gray}(* = required)${c.reset}
`;

    // Add each category
    for (const [catKey, cat] of Object.entries(categories)) {
        if (cat.items.length === 0) continue;
        
        help += `\n  ${c.cyan}${cat.title}:${c.reset}\n`;
        
        for (const opt of cat.items) {
            const flags = opt.flags.join(', ');
            const required = opt.required ? ` ${c.yellow}*${c.reset}` : '';
            const defaultVal = opt.default !== undefined && opt.default !== '' && opt.default !== false && !Array.isArray(opt.default)
                ? ` ${c.gray}[${opt.default}]${c.reset}`
                : '';
            
            help += `    ${c.green}${flags.padEnd(24)}${c.reset} ${opt.description}${defaultVal}${required}\n`;
        }
    }
    
    help += `
${c.yellow}EXAMPLES:${c.reset}

  ${c.cyan}# HTTP Requests${c.reset}
  ${c.gray}# Simple GET${c.reset}
  jsurl -u example.com/api
  ${c.dim}→ {"status": "ok"}${c.reset}

  ${c.gray}# POST with form data${c.reset}
  jsurl -u example.com/login -X POST -d "user=admin&pass=123"

  ${c.gray}# POST with JSON${c.reset}
  jsurl -u example.com/api -X POST -d '{"key":"value"}' -H "Content-Type: application/json"

  ${c.gray}# File upload${c.reset}
  jsurl -u example.com/upload -X POST -F "file=@/path/to/file.txt"

  ${c.gray}# File upload with path traversal${c.reset}
  jsurl -u example.com/upload -X POST -F "file=@local.txt;filename=../../etc/passwd"

  ${c.gray}# Via proxy (Burp Suite)${c.reset}
  jsurl -u example.com/api -x 127.0.0.1:8080

  ${c.gray}# Verbose mode${c.reset}
  jsurl -u example.com/api -v

  ${c.cyan}# WebSocket${c.reset}
  ${c.gray}# Connect and send message${c.reset}
  jsurl -u ws://example.com/ws -m "hello"
  ${c.dim}→ {"response": "world"}${c.reset}

  ${c.gray}# Send multiple messages${c.reset}
  jsurl -u ws://example.com/ws -m "msg1" -m "msg2" -m "msg3"

  ${c.gray}# Listen longer for responses${c.reset}
  jsurl -u ws://example.com/ws -m "key" -l 5000

  ${c.gray}# Interactive mode${c.reset}
  jsurl -u ws://example.com/ws -i

  ${c.gray}# Raw output (messages only)${c.reset}
  jsurl -u ws://example.com/ws -m "key" -r
  ${c.dim}→ secret_flag_here${c.reset}

  ${c.gray}# Via proxy${c.reset}
  jsurl -u ws://example.com/ws -m "test" -x 127.0.0.1:8080

${c.yellow}EXIT CODES:${c.reset}
  0  Success
  1  Validation error
  2  Connection error
  3  HTTP error (4xx/5xx)
  4  Timeout
  5  WebSocket error
`;

    return help;
}

/**
 * Get version string
 * @returns {string}
 */
export function getVersion() {
    return `jsurl v${pkg.version}`;
}
