/**
 * WebSocket Frame Parser/Builder
 * RFC 6455 - https://tools.ietf.org/html/rfc6455
 * 
 * @module jsurl/websocket/frame
 */

import crypto from 'crypto';

/**
 * WebSocket opcodes
 */
export const OPCODES = {
    CONTINUATION: 0x0,
    TEXT: 0x1,
    BINARY: 0x2,
    CLOSE: 0x8,
    PING: 0x9,
    PONG: 0xA,
};

/**
 * Generate WebSocket handshake key
 * @returns {string} - Base64 encoded key
 */
export function generateWebSocketKey() {
    return crypto.randomBytes(16).toString('base64');
}

/**
 * Calculate Sec-WebSocket-Accept for validation
 * @param {string} key - Client key
 * @returns {string} - Expected accept key
 */
export function calculateAcceptKey(key) {
    const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    return crypto
        .createHash('sha1')
        .update(key + GUID)
        .digest('base64');
}

/**
 * Build HTTP upgrade handshake request
 * @param {object} options - Handshake options
 * @param {string} options.host - Target host
 * @param {string} options.path - WebSocket path
 * @param {string} options.key - WebSocket key
 * @param {string[]} options.protocols - Subprotocols
 * @param {string[]} options.headers - Custom headers
 * @returns {string} - HTTP request string
 */
export function buildHandshake(options) {
    const { host, path = '/', key, protocols = [], headers = [] } = options;
    
    let request = `GET ${path} HTTP/1.1\r\n`;
    request += `Host: ${host}\r\n`;
    request += `Upgrade: websocket\r\n`;
    request += `Connection: Upgrade\r\n`;
    request += `Sec-WebSocket-Key: ${key}\r\n`;
    request += `Sec-WebSocket-Version: 13\r\n`;
    
    if (protocols.length > 0) {
        request += `Sec-WebSocket-Protocol: ${protocols.join(', ')}\r\n`;
    }
    
    for (const header of headers) {
        request += `${header}\r\n`;
    }
    
    request += `\r\n`;
    
    return request;
}

/**
 * Validate handshake response
 * @param {Buffer|string} response - HTTP response
 * @param {string} expectedAcceptKey - Expected accept key
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateHandshakeResponse(response, expectedAcceptKey) {
    const lines = response.toString().split('\r\n');
    const statusLine = lines[0];
    
    // Check for 101 Switching Protocols
    if (!statusLine.includes('101')) {
        return { valid: false, error: `Invalid status: ${statusLine}` };
    }
    
    // Find Sec-WebSocket-Accept
    let acceptKey = '';
    for (const line of lines) {
        if (line.toLowerCase().startsWith('sec-websocket-accept:')) {
            acceptKey = line.split(':')[1].trim();
            break;
        }
    }
    
    if (acceptKey !== expectedAcceptKey) {
        return { valid: false, error: 'Invalid accept key' };
    }
    
    return { valid: true };
}

/**
 * Create WebSocket frame
 * @param {string|Buffer} data - Data to send
 * @param {number} opcode - Frame opcode
 * @param {boolean} mask - Whether to mask (client -> server = true)
 * @returns {Buffer} - Frame buffer
 */
export function createFrame(data, opcode = OPCODES.TEXT, mask = true) {
    const payload = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const payloadLength = payload.length;
    
    // Calculate header size
    let headerLength = 2;
    let extendedPayloadLength = 0;
    
    if (payloadLength > 65535) {
        headerLength += 8;
        extendedPayloadLength = 127;
    } else if (payloadLength > 125) {
        headerLength += 2;
        extendedPayloadLength = 126;
    } else {
        extendedPayloadLength = payloadLength;
    }
    
    if (mask) {
        headerLength += 4;
    }
    
    const frame = Buffer.alloc(headerLength + payloadLength);
    let offset = 0;
    
    // Byte 1: FIN + RSV + Opcode
    frame[offset++] = 0x80 | opcode; // FIN = 1
    
    // Byte 2: MASK + Payload length
    frame[offset++] = (mask ? 0x80 : 0x00) | extendedPayloadLength;
    
    // Extended payload length
    if (extendedPayloadLength === 126) {
        frame.writeUInt16BE(payloadLength, offset);
        offset += 2;
    } else if (extendedPayloadLength === 127) {
        frame.writeBigUInt64BE(BigInt(payloadLength), offset);
        offset += 8;
    }
    
    // Masking key
    if (mask) {
        const maskingKey = crypto.randomBytes(4);
        maskingKey.copy(frame, offset);
        offset += 4;
        
        // Apply mask to payload
        for (let i = 0; i < payloadLength; i++) {
            frame[offset + i] = payload[i] ^ maskingKey[i % 4];
        }
    } else {
        payload.copy(frame, offset);
    }
    
    return frame;
}

/**
 * @typedef {object} ParsedFrame
 * @property {boolean} complete - Whether frame is complete
 * @property {boolean} fin - Final fragment flag
 * @property {number} opcode - Frame opcode
 * @property {Buffer} payload - Frame payload
 * @property {number} frameLength - Total frame length
 */

/**
 * Parse received WebSocket frame
 * @param {Buffer} buffer - Received data
 * @returns {ParsedFrame}
 */
export function parseFrame(buffer) {
    if (buffer.length < 2) {
        return { complete: false };
    }
    
    let offset = 0;
    
    // Byte 1
    const byte1 = buffer[offset++];
    const fin = (byte1 & 0x80) !== 0;
    const opcode = byte1 & 0x0F;
    
    // Byte 2
    const byte2 = buffer[offset++];
    const masked = (byte2 & 0x80) !== 0;
    let payloadLength = byte2 & 0x7F;
    
    // Extended payload length
    if (payloadLength === 126) {
        if (buffer.length < offset + 2) return { complete: false };
        payloadLength = buffer.readUInt16BE(offset);
        offset += 2;
    } else if (payloadLength === 127) {
        if (buffer.length < offset + 8) return { complete: false };
        payloadLength = Number(buffer.readBigUInt64BE(offset));
        offset += 8;
    }
    
    // Masking key
    let maskingKey = null;
    if (masked) {
        if (buffer.length < offset + 4) return { complete: false };
        maskingKey = buffer.slice(offset, offset + 4);
        offset += 4;
    }
    
    // Payload
    if (buffer.length < offset + payloadLength) {
        return { complete: false };
    }
    
    let payload = buffer.slice(offset, offset + payloadLength);
    
    // Remove mask
    if (masked) {
        for (let i = 0; i < payload.length; i++) {
            payload[i] ^= maskingKey[i % 4];
        }
    }
    
    return {
        complete: true,
        fin,
        opcode,
        payload,
        frameLength: offset + payloadLength,
    };
}
