/**
 * CLI options definition
 * Standard format: -x/--command
 */

export const options = {
    // ─────────────────────────────────────────────────────────────
    // REQUEST
    // ─────────────────────────────────────────────────────────────
    host: {
        flags: ['-u', '--url'],
        description: 'Target URL (e.g. example.com/api/users)',
        required: true,
        type: 'string',
        category: 'request',
    },
    method: {
        flags: ['-X', '--method'],
        description: 'HTTP method (GET, POST, PUT, DELETE, etc.)',
        default: 'GET',
        type: 'string',
        category: 'request',
    },
    data: {
        flags: ['-d', '--data'],
        description: 'Request body data (e.g. "user=admin&pass=123")',
        default: '',
        type: 'string',
        multiple: true,
        separator: '&',
        category: 'request',
    },
    form: {
        flags: ['-F', '--form'],
        description: 'Form field (e.g. "file=@/path/file.txt" or "name=value")',
        default: [],
        type: 'array',
        multiple: true,
        category: 'request',
    },

    // ─────────────────────────────────────────────────────────────
    // HEADERS
    // ─────────────────────────────────────────────────────────────
    header: {
        flags: ['-H', '--header'],
        description: 'Custom header (e.g. "Content-Type: application/json")',
        default: [],
        type: 'array',
        multiple: true,
        category: 'headers',
    },

    // ─────────────────────────────────────────────────────────────
    // COOKIES
    // ─────────────────────────────────────────────────────────────
    cookie: {
        flags: ['-b', '--cookie'],
        description: 'Cookie to send (e.g. "session=abc123")',
        default: '',
        type: 'string',
        multiple: true,
        separator: '; ',
        category: 'cookies',
    },
    cookieJar: {
        flags: ['-c', '--cookie-jar'],
        description: 'File to save received cookies',
        default: '',
        type: 'string',
        category: 'cookies',
    },

    // ─────────────────────────────────────────────────────────────
    // PROXY
    // ─────────────────────────────────────────────────────────────
    proxy: {
        flags: ['-x', '--proxy'],
        description: 'Proxy in host:port format (e.g. "127.0.0.1:8080")',
        default: '',
        type: 'string',
        category: 'proxy',
    },

    // ─────────────────────────────────────────────────────────────
    // CONNECTION
    // ─────────────────────────────────────────────────────────────
    port: {
        flags: ['-p', '--port'],
        description: 'Target host port',
        default: 80,
        type: 'number',
        category: 'connection',
    },
    timeout: {
        flags: ['-t', '--timeout'],
        description: 'Timeout in milliseconds',
        default: 10000,
        type: 'number',
        category: 'connection',
    },

    // ─────────────────────────────────────────────────────────────
    // OUTPUT
    // ─────────────────────────────────────────────────────────────
    verbose: {
        flags: ['-v', '--verbose'],
        description: 'Verbose mode (show more details)',
        default: false,
        type: 'boolean',
        category: 'output',
    },
    silent: {
        flags: ['-s', '--silent'],
        description: 'Silent mode (only show response body)',
        default: false,
        type: 'boolean',
        category: 'output',
    },
    noColor: {
        flags: ['-n', '--no-color'],
        description: 'Disable colored output',
        default: false,
        type: 'boolean',
        category: 'output',
    },
    output: {
        flags: ['-o', '--output'],
        description: 'Save response to file',
        default: '',
        type: 'string',
        category: 'output',
    },

    // ─────────────────────────────────────────────────────────────
    // INFO
    // ─────────────────────────────────────────────────────────────
    help: {
        flags: ['-h', '--help'],
        description: 'Show this help message',
        default: false,
        type: 'boolean',
        category: 'info',
    },
    version: {
        flags: ['-V', '--version'],
        description: 'Show version',
        default: false,
        type: 'boolean',
        category: 'info',
    },
};

// Positional arguments order (for compatibility)
export const positionalOrder = ['host', 'proxy', 'port'];
