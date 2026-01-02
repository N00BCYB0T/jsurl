/**
 * WebSocket Client
 * 
 * Raw socket WebSocket client implementation.
 * 
 * @module jsurl/websocket/client
 */

import { EventEmitter } from 'events';
import { createPersistentConnection } from '../transport/tcp.js';
import {
    OPCODES,
    generateWebSocketKey,
    calculateAcceptKey,
    buildHandshake,
    validateHandshakeResponse,
    createFrame,
    parseFrame,
} from './frame.js';
import { ConnectionError } from '../utils/errors.js';

/**
 * WebSocket Client
 * @extends EventEmitter
 * 
 * Events:
 *   - open: Connection established
 *   - message: Message received (string or Buffer)
 *   - ping: Ping received
 *   - pong: Pong received
 *   - close: Connection closed
 *   - error: Error occurred
 */
export class WebSocketClient extends EventEmitter {
    /**
     * Create WebSocket client
     * @param {object} options - Connection options
     * @param {string} options.host - Target host
     * @param {number} options.port - Target port
     * @param {string} options.path - WebSocket path
     * @param {string[]} options.headers - Custom headers
     * @param {string[]} options.protocols - Subprotocols
     * @param {number} options.timeout - Connection timeout
     * @param {object} options.proxy - Proxy configuration
     */
    constructor(options = {}) {
        super();
        
        this.host = options.host;
        this.port = options.port || 80;
        this.path = options.path || '/';
        this.headers = options.headers || [];
        this.protocols = options.protocols || [];
        this.timeout = options.timeout || 10000;
        
        // Proxy (optional)
        this.proxy = options.proxy || null;
        
        this.socket = null;
        this.connected = false;
        this.buffer = Buffer.alloc(0);
    }

    /**
     * Connect to WebSocket server
     * @returns {Promise<WebSocketClient>}
     */
    async connect() {
        const connectHost = this.proxy ? this.proxy.host : this.host;
        const connectPort = this.proxy ? this.proxy.port : this.port;

        // Create TCP connection (without data handler - we add it after handshake)
        this.socket = await createPersistentConnection({
            host: connectHost,
            port: connectPort,
            timeout: this.timeout,
            onClose: () => this._onClose(),
            onError: (err) => this._onError(err),
        });

        // If using proxy, establish CONNECT tunnel first
        if (this.proxy) {
            await this._establishProxyTunnel();
        }

        // Perform WebSocket handshake
        await this._performHandshake();
        
        // Now register data handler for WebSocket frames
        this.socket.on('data', (data) => this._onData(data));
        
        // Process any buffered data from handshake
        if (this.buffer.length > 0) {
            this._onData(Buffer.alloc(0));
        }
        
        this.connected = true;
        this.emit('open');
        
        return this;
    }

    /**
     * Establish HTTP CONNECT tunnel through proxy
     * @private
     * @returns {Promise<void>}
     */
    async _establishProxyTunnel() {
        return new Promise((resolve, reject) => {
            const connectRequest = 
                `CONNECT ${this.host}:${this.port} HTTP/1.1\r\n` +
                `Host: ${this.host}:${this.port}\r\n` +
                `Proxy-Connection: keep-alive\r\n` +
                `\r\n`;
            
            let response = Buffer.alloc(0);
            let tunnelEstablished = false;
            
            // Timeout for proxy tunnel
            const timeoutId = setTimeout(() => {
                if (!tunnelEstablished) {
                    this.socket.removeListener('data', onData);
                    reject(new ConnectionError(
                        'Proxy tunnel timeout',
                        'PROXY_TUNNEL_TIMEOUT'
                    ));
                }
            }, this.timeout);
            
            const onData = (data) => {
                response = Buffer.concat([response, data]);
                
                // Look for end of HTTP response
                const headerEnd = response.indexOf('\r\n\r\n');
                if (headerEnd !== -1 && !tunnelEstablished) {
                    tunnelEstablished = true;
                    clearTimeout(timeoutId);
                    
                    const statusLine = response.toString().split('\r\n')[0];
                    
                    // Check for 200 Connection established
                    if (!statusLine.includes('200')) {
                        this.socket.removeListener('data', onData);
                        reject(new ConnectionError(
                            `Proxy tunnel failed: ${statusLine}`,
                            'PROXY_TUNNEL_ERROR'
                        ));
                        return;
                    }
                    
                    // Remove listener and resolve
                    this.socket.removeListener('data', onData);
                    resolve();
                }
            };
            
            this.socket.on('data', onData);
            this.socket.write(connectRequest);
        });
    }

    /**
     * Perform WebSocket handshake
     * @private
     * @returns {Promise<void>}
     */
    async _performHandshake() {
        return new Promise((resolve, reject) => {
            const key = generateWebSocketKey();
            const expectedAccept = calculateAcceptKey(key);
            
            const handshake = buildHandshake({
                host: this.host,
                path: this.path,
                key,
                protocols: this.protocols,
                headers: this.headers,
            });
            
            let response = Buffer.alloc(0);
            let handshakeComplete = false;
            
            // Timeout for handshake
            const timeoutId = setTimeout(() => {
                if (!handshakeComplete) {
                    this.socket.removeListener('data', onData);
                    reject(new ConnectionError(
                        'WebSocket handshake timeout',
                        'WS_HANDSHAKE_TIMEOUT'
                    ));
                }
            }, this.timeout);
            
            const onData = (data) => {
                response = Buffer.concat([response, data]);
                
                // Look for end of HTTP header
                const headerEnd = response.indexOf('\r\n\r\n');
                if (headerEnd !== -1 && !handshakeComplete) {
                    handshakeComplete = true;
                    clearTimeout(timeoutId);
                    
                    const validation = validateHandshakeResponse(response, expectedAccept);
                    
                    if (!validation.valid) {
                        this.socket.removeListener('data', onData);
                        reject(new ConnectionError(
                            `WebSocket handshake failed: ${validation.error}`,
                            'WS_HANDSHAKE_ERROR'
                        ));
                        return;
                    }
                    
                    // Store remaining data (possible frames)
                    this.buffer = response.slice(headerEnd + 4);
                    
                    // Remove temporary listener
                    this.socket.removeListener('data', onData);
                    
                    resolve();
                }
            };
            
            this.socket.on('data', onData);
            this.socket.write(handshake);
        });
    }

    /**
     * Process received data
     * @private
     * @param {Buffer} data
     */
    _onData(data) {
        this.buffer = Buffer.concat([this.buffer, data]);
        
        // Try to parse frames
        while (this.buffer.length > 0) {
            const frame = parseFrame(this.buffer);
            
            if (!frame.complete) {
                break;
            }
            
            // Remove processed frame from buffer
            this.buffer = this.buffer.slice(frame.frameLength);
            
            // Emit event based on opcode
            switch (frame.opcode) {
                case OPCODES.TEXT:
                    this.emit('message', frame.payload.toString('utf-8'));
                    break;
                    
                case OPCODES.BINARY:
                    this.emit('message', frame.payload);
                    break;
                    
                case OPCODES.PING:
                    // Respond with PONG
                    this._sendFrame(frame.payload, OPCODES.PONG);
                    this.emit('ping', frame.payload);
                    break;
                    
                case OPCODES.PONG:
                    this.emit('pong', frame.payload);
                    break;
                    
                case OPCODES.CLOSE:
                    this.emit('close', frame.payload);
                    this.close();
                    break;
            }
        }
    }

    /**
     * Handle connection close
     * @private
     */
    _onClose() {
        this.connected = false;
        this.emit('close');
    }

    /**
     * Handle error
     * @private
     * @param {Error} err
     */
    _onError(err) {
        this.emit('error', err);
    }

    /**
     * Check if client can send data
     * @private
     * @returns {boolean}
     */
    _canSend() {
        return this.connected && this.socket && !this.socket.destroyed;
    }

    /**
     * Send message
     * @param {string|Buffer} data - Message data
     * @throws {Error} If not connected
     */
    send(data) {
        if (!this._canSend()) {
            throw new Error('WebSocket is not connected');
        }
        
        const opcode = typeof data === 'string' ? OPCODES.TEXT : OPCODES.BINARY;
        this._sendFrame(data, opcode);
    }

    /**
     * Send frame
     * @private
     * @param {string|Buffer} data
     * @param {number} opcode
     */
    _sendFrame(data, opcode) {
        if (!this.socket || this.socket.destroyed) {
            return;
        }
        const frame = createFrame(data, opcode, true); // mask = true for client
        this.socket.write(frame);
    }

    /**
     * Send ping
     * @param {string|Buffer} data - Ping data
     * @throws {Error} If not connected
     */
    ping(data = '') {
        if (!this._canSend()) {
            throw new Error('WebSocket is not connected');
        }
        this._sendFrame(data, OPCODES.PING);
    }

    /**
     * Close connection
     * @param {number} code - Close code (default: 1000 = normal)
     * @param {string} reason - Close reason
     */
    close(code = 1000, reason = '') {
        if (!this.socket) {
            return;
        }
        
        // Send close frame if still connected
        if (this.connected && !this.socket.destroyed) {
            const payload = Buffer.alloc(2 + Buffer.byteLength(reason));
            payload.writeUInt16BE(code, 0);
            if (reason) {
                payload.write(reason, 2, 'utf-8');
            }
            
            this._sendFrame(payload, OPCODES.CLOSE);
        }
        
        // Always try to close the socket
        if (!this.socket.destroyed) {
            this.socket.end();
        }
        
        this.connected = false;
    }
}

/**
 * Create and connect WebSocket client
 * @param {string} url - WebSocket URL (ws:// or wss://)
 * @param {object} options - Additional options
 * @returns {Promise<WebSocketClient>}
 */
export async function connect(url, options = {}) {
    // Parse URL
    let host, port, path;
    
    if (url.startsWith('ws://') || url.startsWith('wss://')) {
        const parsed = new URL(url);
        host = parsed.hostname;
        port = parsed.port || (url.startsWith('wss://') ? 443 : 80);
        path = parsed.pathname + parsed.search;
    } else {
        host = url;
        port = options.port || 80;
        path = options.path || '/';
    }
    
    const client = new WebSocketClient({
        host,
        port,
        path,
        ...options,
    });
    
    await client.connect();
    return client;
}
