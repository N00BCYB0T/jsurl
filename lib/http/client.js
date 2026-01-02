/**
 * HTTP Client using raw sockets
 * 
 * This module provides low-level HTTP request capabilities
 * using the transport layer for TCP connections.
 */

import { createConnection, sendAndReceive } from '../transport/tcp.js';
import { buildRequest } from './request.js';
import { ConnectionError, TimeoutError } from '../utils/errors.js';

/**
 * Socket error messages mapping
 */
const SOCKET_ERRORS = {
    'ECONNREFUSED': (host, port) => 
        `Connection refused at ${host}:${port}. Is the server running?\n` +
        `   Tip: Check if the host/port are correct`,
    
    'ENOTFOUND': (host) => 
        `Hostname not found: ${host}\n` +
        `   Tip: Check if the hostname is correct`,
    
    'ETIMEDOUT': (host, port) => 
        `Connection timeout at ${host}:${port}\n` +
        `   Tip: Check if there's a firewall blocking the connection`,
    
    'ECONNRESET': () => 
        `Connection reset by server\n` +
        `   Tip: The server closed the connection abruptly`,
    
    'EHOSTUNREACH': (host) => 
        `Host unreachable: ${host}\n` +
        `   Tip: Check your network connection`,
    
    'ENETUNREACH': () => 
        `Network unreachable\n` +
        `   Tip: Check your network connection`,
    
    'EADDRINUSE': (host, port) => 
        `Port ${port} already in use`,
    
    'EPIPE': () => 
        `Broken pipe - connection closed before sending all data`,
};

/**
 * Translate socket error to friendly message
 * @param {Error} err - Socket error
 * @param {string} host - Target host
 * @param {number} port - Target port
 * @returns {string}
 */
export function translateSocketError(err, host, port) {
    const handler = SOCKET_ERRORS[err.code];
    if (handler) {
        return handler(host, port);
    }
    return `Socket error: ${err.message} (code: ${err.code || 'unknown'})`;
}

/**
 * Send HTTP request
 * @param {object} requestObj - Request object
 * @returns {Promise<string>} - Raw HTTP response
 */
export async function sendRequest(requestObj) {
    const {
        method,
        host,
        port,
        path,
        data,
        form,
        headers,
        cookie,
        proxy,
        timeout,
    } = requestObj;

    // Determine if using proxy or direct connection
    const useProxy = proxy && proxy.host && proxy.port;
    
    // Connection target (proxy or direct)
    const connectHost = useProxy ? proxy.host : host;
    const connectPort = useProxy ? proxy.port : port;

    try {
        // Build the request (returns Buffer)
        const request = buildRequest({
            method,
            host,
            port,
            path,
            data,
            form,
            headers,
            cookie,
            useProxy,
        });

        // Create connection
        const socket = await createConnection({
            host: connectHost,
            port: connectPort,
            timeout,
        });

        // Send request and receive response
        const responseBuffer = await sendAndReceive(socket, request, timeout);
        
        return responseBuffer.toString();
        
    } catch (err) {
        if (err instanceof ConnectionError || err instanceof TimeoutError) {
            throw err;
        }
        
        // Translate socket error
        const message = translateSocketError(err, connectHost, connectPort);
        throw new ConnectionError(message, err.code, err);
    }
}

/**
 * Get formatted request string (for debug/verbose mode)
 * @param {object} requestObj - Request object
 * @returns {string}
 */
export function getRequestString(requestObj) {
    const useProxy = requestObj.proxy && requestObj.proxy.host && requestObj.proxy.port;
    
    const requestBuffer = buildRequest({
        method: requestObj.method,
        host: requestObj.host,
        port: requestObj.port,
        path: requestObj.path,
        data: requestObj.data,
        form: requestObj.form,
        headers: requestObj.headers,
        cookie: requestObj.cookie,
        useProxy,
    });
    
    return requestBuffer.toString();
}
