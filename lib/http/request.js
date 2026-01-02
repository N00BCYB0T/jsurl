/**
 * HTTP Request Builder
 * 
 * Constructs raw HTTP requests for sending over sockets.
 * Supports multipart/form-data for file uploads.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Generate unique boundary for multipart requests
 * @returns {string}
 */
function generateBoundary() {
    return '----jsurl' + crypto.randomBytes(16).toString('hex');
}

/**
 * Check if header exists (case-insensitive)
 * @param {string[]} headers - Array of headers
 * @param {string} name - Header name to check
 * @returns {boolean}
 */
function hasHeader(headers, name) {
    const lowerName = name.toLowerCase();
    return headers.some(h => h.toLowerCase().startsWith(lowerName + ':'));
}

/**
 * Parse curl-style file options
 * Format: @filepath;filename=name;type=mimetype
 * 
 * @param {string} value - Field value (e.g. "@file.txt;filename=../../file.txt")
 * @returns {{ filePath: string, fileName: string, mimeType: string }}
 */
function parseFileOptions(value) {
    // Remove leading @
    const withoutAt = value.substring(1);
    
    // Split by ; to get options
    const parts = withoutAt.split(';');
    const filePath = parts[0];
    
    let fileName = path.basename(filePath);
    let mimeType = 'application/octet-stream';
    
    // Process additional options (filename=, type=)
    for (let i = 1; i < parts.length; i++) {
        const opt = parts[i].trim();
        if (opt.startsWith('filename=')) {
            fileName = opt.substring(9);
        } else if (opt.startsWith('type=')) {
            mimeType = opt.substring(5);
        }
    }
    
    return { filePath, fileName, mimeType };
}

/**
 * Build multipart/form-data body
 * @param {string[]} formFields - Array of form fields
 * @param {string} boundary - Boundary string
 * @returns {Buffer}
 */
function buildMultipartBody(formFields, boundary) {
    const parts = [];
    
    for (const field of formFields) {
        const eqIndex = field.indexOf('=');
        if (eqIndex === -1) continue;
        
        const name = field.substring(0, eqIndex);
        const value = field.substring(eqIndex + 1);
        
        if (value.startsWith('@')) {
            // File upload with curl syntax: @filepath;filename=name;type=mime
            const { filePath, fileName, mimeType } = parseFileOptions(value);
            
            try {
                const fileContent = fs.readFileSync(filePath);
                
                parts.push(Buffer.from(
                    `--${boundary}\r\n` +
                    `Content-Disposition: form-data; name="${name}"; filename="${fileName}"\r\n` +
                    `Content-Type: ${mimeType}\r\n\r\n`
                ));
                parts.push(fileContent);
                parts.push(Buffer.from('\r\n'));
            } catch (err) {
                throw new Error(`Error reading file: ${filePath} - ${err.message}`);
            }
        } else {
            // Regular field
            parts.push(Buffer.from(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
                `${value}\r\n`
            ));
        }
    }
    
    // Final boundary
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    
    return Buffer.concat(parts);
}

/**
 * Build raw HTTP request
 * @param {object} options - Request options
 * @param {string} options.method - HTTP method
 * @param {string} options.host - Target host
 * @param {number} options.port - Target port
 * @param {string} options.path - Request path
 * @param {string} options.data - Request body data
 * @param {string[]} options.form - Form fields for multipart
 * @param {string[]} options.headers - Custom headers
 * @param {string} options.cookie - Cookie header value
 * @param {boolean} options.useProxy - Whether to use absolute URL (for proxy)
 * @returns {Buffer}
 */
export function buildRequest(options) {
    const {
        method = 'GET',
        host,
        port = 80,
        path = '/',
        data = '',
        form = [],
        headers = [],
        cookie = '',
        useProxy = false,
    } = options;

    // Request line
    // If using proxy, use absolute URL; otherwise, relative
    const requestLine = useProxy
        ? `${method.toUpperCase()} http://${host}:${port}${path} HTTP/1.1`
        : `${method.toUpperCase()} ${path} HTTP/1.1`;
    
    let headerSection = `${requestLine}\r\n`;
    
    // Required headers
    headerSection += `Host: ${host}\r\n`;
    headerSection += `Connection: close\r\n`;
    
    // Cookie header
    if (cookie) {
        headerSection += `Cookie: ${cookie}\r\n`;
    }
    
    // Custom headers
    for (const header of headers) {
        headerSection += `${header}\r\n`;
    }
    
    // Determine body type
    if (form.length > 0) {
        // Multipart form-data
        const boundary = generateBoundary();
        const bodyBuffer = buildMultipartBody(form, boundary);
        
        if (!hasHeader(headers, 'Content-Type')) {
            headerSection += `Content-Type: multipart/form-data; boundary=${boundary}\r\n`;
        }
        headerSection += `Content-Length: ${bodyBuffer.length}\r\n`;
        headerSection += `\r\n`;
        
        return Buffer.concat([Buffer.from(headerSection), bodyBuffer]);
        
    } else if (data) {
        // Regular body (urlencoded or other)
        if (!hasHeader(headers, 'Content-Type')) {
            headerSection += `Content-Type: application/x-www-form-urlencoded\r\n`;
        }
        headerSection += `Content-Length: ${Buffer.byteLength(data)}\r\n`;
        headerSection += `\r\n`;
        headerSection += data;
        
        return Buffer.from(headerSection);
        
    } else {
        // No body
        headerSection += `\r\n`;
        return Buffer.from(headerSection);
    }
}

/**
 * Parse proxy string in host:port format
 * @param {string} proxyString - Proxy string
 * @returns {{ host: string, port: number } | null}
 */
export function parseProxy(proxyString) {
    if (!proxyString || proxyString.trim() === '') {
        return null;
    }
    
    const [host, portStr] = proxyString.split(':');
    return {
        host: host || '127.0.0.1',
        port: parseInt(portStr) || 8080,
    };
}

/**
 * Create structured request object from CLI params
 * @param {object} params - CLI parameters
 * @returns {object}
 */
export function createRequestObject(params) {
    return {
        method: (params.method || 'GET').toUpperCase(),
        host: params.host,
        port: params.port || 80,
        path: params.path || '/',
        data: params.data || '',
        form: params.form || [],
        headers: params.header || [],
        cookie: params.cookie || '',
        proxy: parseProxy(params.proxy),
        timeout: params.timeout || 10000,
        output: params.output || '',
    };
}
