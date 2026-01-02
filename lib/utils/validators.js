/**
 * Validation utilities
 */

import { ValidationError } from './errors.js';

/**
 * Validate port number (1-65535)
 * @param {number|string} port - Port to validate
 * @param {string} fieldName - Field name for error messages
 * @returns {number} - Validated port number
 * @throws {ValidationError}
 */
export function validatePort(port, fieldName = 'port') {
    const portNum = parseInt(port);
    if (isNaN(portNum)) {
        throw new ValidationError(`${fieldName} must be a number`, fieldName);
    }
    if (portNum < 1 || portNum > 65535) {
        throw new ValidationError(
            `${fieldName} must be between 1 and 65535 (got: ${portNum})`,
            fieldName
        );
    }
    return portNum;
}

/**
 * Validate hostname format
 * @param {string} hostname - Hostname to validate
 * @returns {string} - Validated hostname
 * @throws {ValidationError}
 */
export function validateHostname(hostname) {
    if (!hostname || hostname.trim() === '') {
        throw new ValidationError('Hostname cannot be empty', 'hostname');
    }
    
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;
    if (!hostnameRegex.test(hostname)) {
        throw new ValidationError(`Invalid hostname: ${hostname}`, 'hostname');
    }
    
    return hostname;
}

/**
 * Validate path starts with /
 * @param {string} path - Path to validate
 * @returns {string} - Validated path
 * @throws {ValidationError}
 */
export function validatePath(path) {
    if (!path.startsWith('/')) {
        throw new ValidationError(`Path must start with / (got: ${path})`, 'path');
    }
    return path;
}

/**
 * Parse URL and extract host, path, port, and protocol
 * 
 * Supported formats:
 *   - example.com
 *   - example.com/path
 *   - example.com:8080/path
 *   - http://example.com/path
 *   - https://example.com:443/path
 * 
 * @param {string} input - URL or hostname
 * @returns {{ host: string, path: string, port: number|null, protocol: string|null }}
 */
export function parseUrl(input) {
    if (!input) {
        return { host: '', path: '/', port: null, protocol: null };
    }
    
    let url = input.trim();
    let protocol = null;
    let port = null;
    
    // Extract protocol if present
    const protocolMatch = url.match(/^(https?):\/\//);
    if (protocolMatch) {
        protocol = protocolMatch[1];
        url = url.replace(/^https?:\/\//, '');
    }
    
    // Split host+port from path
    const firstSlash = url.indexOf('/');
    let hostPart = firstSlash === -1 ? url : url.substring(0, firstSlash);
    let path = firstSlash === -1 ? '/' : url.substring(firstSlash);
    
    // Extract port from host if present
    const portMatch = hostPart.match(/:(\d+)$/);
    if (portMatch) {
        port = parseInt(portMatch[1]);
        hostPart = hostPart.replace(/:\d+$/, '');
    }
    
    // Clean the path
    path = cleanPath(path);
    
    return {
        host: hostPart,
        path,
        port,
        protocol,
    };
}

/**
 * Clean hostname removing protocol and extra slashes
 * @deprecated Use parseUrl() to extract host and path together
 * @param {string} input - Input string
 * @returns {string} - Cleaned hostname
 */
export function cleanHostname(input) {
    return parseUrl(input).host;
}

/**
 * Clean path ensuring it starts with a single slash
 * @param {string} input - Input path
 * @returns {string} - Cleaned path
 */
export function cleanPath(input) {
    if (!input) return '/';
    let path = input;
    
    // Remove multiple leading slashes
    path = path.replace(/^\/+/, '/');
    
    // Add leading slash if missing
    if (!path.startsWith('/')) {
        path = '/' + path;
    }
    
    return path;
}
