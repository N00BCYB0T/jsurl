/**
 * HTTP Response Parser
 * 
 * Parses raw HTTP responses into structured objects.
 */

/**
 * @typedef {object} ParsedResponse
 * @property {boolean} valid - Whether the response is valid HTTP
 * @property {number} statusCode - HTTP status code
 * @property {string} statusText - HTTP status text
 * @property {object} headers - Response headers (lowercase keys)
 * @property {string} body - Response body
 * @property {string} raw - Raw response string
 * @property {function} isSuccess - Check if 2xx status
 * @property {function} isRedirect - Check if 3xx status
 * @property {function} isClientError - Check if 4xx status
 * @property {function} isServerError - Check if 5xx status
 */

/**
 * Parse raw HTTP response
 * @param {string} response - Raw HTTP response
 * @returns {ParsedResponse}
 */
export function parseResponse(response) {
    if (!response || response.trim() === '') {
        return {
            valid: false,
            error: 'Empty response',
            raw: response,
        };
    }

    const lines = response.split('\r\n');
    const statusLine = lines[0];
    
    // Parse status line (e.g. "HTTP/1.1 200 OK")
    const statusMatch = statusLine.match(/^HTTP\/[\d.]+\s+(\d+)\s*(.*)$/);
    
    if (!statusMatch) {
        return {
            valid: false,
            error: 'Invalid HTTP response format',
            raw: response,
        };
    }

    const statusCode = parseInt(statusMatch[1]);
    const statusText = statusMatch[2] || '';

    // Separate headers from body
    const headerEndIndex = response.indexOf('\r\n\r\n');
    const headers = {};
    const headerLines = response.substring(0, headerEndIndex).split('\r\n').slice(1);
    
    headerLines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim().toLowerCase();
            const value = line.substring(colonIndex + 1).trim();
            
            // Headers can have multiple values (e.g. Set-Cookie)
            if (headers[key]) {
                if (Array.isArray(headers[key])) {
                    headers[key].push(value);
                } else {
                    headers[key] = [headers[key], value];
                }
            } else {
                headers[key] = value;
            }
        }
    });

    const body = headerEndIndex > 0 ? response.substring(headerEndIndex + 4) : '';

    return {
        valid: true,
        statusCode,
        statusText,
        headers,
        body,
        raw: response,
        
        // Helper methods
        isSuccess: () => statusCode >= 200 && statusCode < 300,
        isRedirect: () => statusCode >= 300 && statusCode < 400,
        isClientError: () => statusCode >= 400 && statusCode < 500,
        isServerError: () => statusCode >= 500,
    };
}

/**
 * Extract cookies from response (Set-Cookie headers)
 * @param {string} response - Raw HTTP response
 * @returns {string[]} - Array of cookie strings
 */
export function extractCookies(response) {
    const cookies = [];
    const lines = response.split('\r\n');
    
    for (const line of lines) {
        if (line.toLowerCase().startsWith('set-cookie:')) {
            const cookieValue = line.substring('set-cookie:'.length).trim();
            cookies.push(cookieValue);
        }
    }
    
    return cookies;
}

/**
 * @typedef {object} ParsedCookie
 * @property {string} name - Cookie name
 * @property {string} value - Cookie value
 * @property {string} domain - Cookie domain
 * @property {string} path - Cookie path
 * @property {boolean} secure - Secure flag
 * @property {boolean} httpOnly - HttpOnly flag
 * @property {Date|null} expires - Expiration date
 * @property {number|null} maxAge - Max age in seconds
 * @property {string} sameSite - SameSite attribute
 */

/**
 * Parse individual cookie string
 * @param {string} cookieString - Set-Cookie header value
 * @returns {ParsedCookie}
 */
export function parseCookie(cookieString) {
    const parts = cookieString.split(';').map(p => p.trim());
    const [nameValue, ...attributes] = parts;
    const [name, value] = nameValue.split('=');
    
    const cookie = {
        name: name?.trim(),
        value: value?.trim(),
        domain: '',
        path: '/',
        secure: false,
        httpOnly: false,
        expires: null,
        maxAge: null,
        sameSite: '',
    };
    
    for (const attr of attributes) {
        const [attrName, attrValue] = attr.split('=').map(s => s?.trim());
        const lowerName = attrName?.toLowerCase();
        
        switch (lowerName) {
            case 'domain':
                cookie.domain = attrValue || '';
                break;
            case 'path':
                cookie.path = attrValue || '/';
                break;
            case 'secure':
                cookie.secure = true;
                break;
            case 'httponly':
                cookie.httpOnly = true;
                break;
            case 'expires':
                cookie.expires = attrValue ? new Date(attrValue) : null;
                break;
            case 'max-age':
                cookie.maxAge = attrValue ? parseInt(attrValue) : null;
                break;
            case 'samesite':
                cookie.sameSite = attrValue || '';
                break;
        }
    }
    
    return cookie;
}
