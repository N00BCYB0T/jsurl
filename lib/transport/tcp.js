/**
 * TCP Transport Layer
 * 
 * Base transport for HTTP and WebSocket connections.
 * Provides low-level socket operations.
 */

import net from 'net';
import { ConnectionError, TimeoutError } from '../utils/errors.js';

/**
 * Create a TCP connection
 * @param {object} options - Connection options
 * @param {string} options.host - Target host
 * @param {number} options.port - Target port
 * @param {number} options.timeout - Connection timeout in ms
 * @returns {Promise<net.Socket>} - Connected socket
 */
export function createConnection(options) {
    const { host, port, timeout = 10000 } = options;

    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);

        socket.connect(port, host, () => {
            resolve(socket);
        });

        socket.on('error', (err) => {
            reject(new ConnectionError(
                `Connection error at ${host}:${port}: ${err.message}`,
                err.code,
                err
            ));
        });

        socket.on('timeout', () => {
            socket.destroy();
            reject(new TimeoutError(
                `Connection timeout at ${host}:${port}`,
                timeout
            ));
        });
    });
}

/**
 * Send data and wait for response (one-shot)
 * Ideal for HTTP request/response pattern
 * @param {net.Socket} socket - Connected socket
 * @param {Buffer|string} data - Data to send
 * @param {number} timeout - Response timeout in ms
 * @returns {Promise<Buffer>} - Response data
 */
export function sendAndReceive(socket, data, timeout = 10000) {
    return new Promise((resolve, reject) => {
        let response = Buffer.alloc(0);
        
        socket.setTimeout(timeout);

        socket.write(data, (err) => {
            if (err) {
                reject(new ConnectionError('Error sending data', 'WRITE_ERROR', err));
            }
        });

        socket.on('data', (chunk) => {
            response = Buffer.concat([response, chunk]);
        });

        socket.on('close', () => {
            resolve(response);
        });

        socket.on('error', (err) => {
            reject(new ConnectionError(err.message, err.code, err));
        });

        socket.on('timeout', () => {
            socket.destroy();
            reject(new TimeoutError('Response timeout', timeout));
        });
    });
}

/**
 * Create persistent connection for bidirectional communication
 * Ideal for WebSocket
 * @param {object} options - Connection options
 * @param {string} options.host - Target host
 * @param {number} options.port - Target port
 * @param {number} options.timeout - Connection timeout in ms
 * @param {function} options.onData - Data handler
 * @param {function} options.onClose - Close handler
 * @param {function} options.onError - Error handler
 * @returns {Promise<net.Socket>} - Connected socket
 */
export function createPersistentConnection(options) {
    const { host, port, timeout = 10000, onData, onClose, onError } = options;

    return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(timeout);

        socket.connect(port, host, () => {
            // Remove timeout after connection (WebSocket stays open)
            socket.setTimeout(0);
            
            // Configure handlers
            if (onData) socket.on('data', onData);
            if (onClose) socket.on('close', onClose);
            if (onError) socket.on('error', onError);
            
            resolve(socket);
        });

        socket.on('error', (err) => {
            reject(new ConnectionError(
                `Connection error at ${host}:${port}`,
                err.code,
                err
            ));
        });

        socket.on('timeout', () => {
            socket.destroy();
            reject(new TimeoutError(`Connection timeout`, timeout));
        });
    });
}
