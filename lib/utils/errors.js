/**
 * Custom error classes for jsurl
 * 
 * Hierarchy:
 *   JsurlError (base)
 *   ├── ValidationError  - Invalid input parameters
 *   ├── ConnectionError  - Network/socket errors
 *   ├── HttpError        - HTTP protocol errors
 *   └── TimeoutError     - Connection/response timeouts
 */

/**
 * Exit codes for CLI
 */
export const EXIT_CODES = {
    SUCCESS: 0,
    VALIDATION_ERROR: 1,
    CONNECTION_ERROR: 2,
    HTTP_ERROR: 3,
    TIMEOUT_ERROR: 4,
    WEBSOCKET_ERROR: 5,
    UNKNOWN_ERROR: 99,
};

/**
 * Base error class
 */
export class JsurlError extends Error {
    constructor(message, code = 'JSURL_ERROR') {
        super(message);
        this.name = 'JsurlError';
        this.code = code;
    }
}

/**
 * Validation error - invalid input parameters
 */
export class ValidationError extends JsurlError {
    constructor(message, field = null) {
        super(message, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
        this.field = field;
    }
}

/**
 * Connection error - network/socket errors
 */
export class ConnectionError extends JsurlError {
    constructor(message, code = 'CONNECTION_ERROR', cause = null) {
        super(message, code);
        this.name = 'ConnectionError';
        this.cause = cause;
    }
}

/**
 * HTTP error - protocol errors (4xx, 5xx)
 */
export class HttpError extends JsurlError {
    constructor(message, statusCode = 0, response = null) {
        super(message, 'HTTP_ERROR');
        this.name = 'HttpError';
        this.statusCode = statusCode;
        this.response = response;
    }
}

/**
 * Timeout error - connection/response timeouts
 */
export class TimeoutError extends JsurlError {
    constructor(message, timeout = 0) {
        super(message, 'TIMEOUT_ERROR');
        this.name = 'TimeoutError';
        this.timeout = timeout;
    }
}

/**
 * WebSocket error - WebSocket protocol errors
 */
export class WebSocketError extends JsurlError {
    constructor(message, code = 'WS_ERROR', closeCode = null) {
        super(message, code);
        this.name = 'WebSocketError';
        this.closeCode = closeCode;
    }
}
