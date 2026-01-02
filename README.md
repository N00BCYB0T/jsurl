# jsurl

Raw socket HTTP client for Node.js. Uses only Node.js internal modules - no external dependencies.

## Features

- Raw TCP socket connections
- HTTP/1.1 protocol support
- Multipart form-data (file uploads)
- Cookie management (Netscape format)
- Proxy support (HTTP proxies, Burp Suite, etc.)
- WebSocket client
- CLI and programmatic API
- Zero external dependencies

## Installation

```bash
cd jsurl
npm link
```

## CLI Usage

```bash
# Simple GET request
jsurl -u example.com/api

# POST with form data
jsurl -u example.com/login -X POST -d "user=admin&pass=123"

# POST with JSON
jsurl -u example.com/api -X POST -d '{"key":"value"}' -H "Content-Type: application/json"

# File upload
jsurl -u example.com/upload -X POST -F "file=@/path/to/file.txt"

# File upload with custom filename (path traversal testing)
jsurl -u example.com/upload -X POST -F "file=@local.txt;filename=../../etc/passwd"

# Via proxy (Burp Suite, netcat, etc.)
jsurl -u example.com/api -x 127.0.0.1:8080

# Custom port
jsurl -u example.com:8443/secure

# Verbose mode (shows full request/response)
jsurl -u example.com/api -v

# Save response to file
jsurl -u example.com/api -o response.txt
```

## CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `-u, --url` | Target URL (required) | - |
| `-X, --method` | HTTP method | GET |
| `-d, --data` | Request body data | - |
| `-F, --form` | Form field (file=@path or name=value) | - |
| `-H, --header` | Custom header | - |
| `-b, --cookie` | Cookie to send | - |
| `-c, --cookie-jar` | File to save cookies | - |
| `-x, --proxy` | Proxy host:port | - |
| `-p, --port` | Target port | 80 |
| `-t, --timeout` | Timeout in ms | 10000 |
| `-v, --verbose` | Verbose output | false |
| `-s, --silent` | Silent mode (body only) | false |
| `-n, --no-color` | Disable colors | false |
| `-o, --output` | Save response to file | - |
| `-h, --help` | Show help | - |
| `-V, --version` | Show version | - |

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Validation error |
| 2 | Connection error |
| 3 | HTTP error (4xx/5xx) |
| 4 | Timeout |

## Programmatic API

```javascript
import { sendRequest, createRequestObject } from 'jsurl/http';
import { WebSocketClient } from 'jsurl/websocket';

// HTTP Request
const request = createRequestObject({
    host: 'example.com',
    path: '/api',
    method: 'POST',
    data: 'key=value',
});

const response = await sendRequest(request);
console.log(response);

// WebSocket
const ws = new WebSocketClient({
    host: 'example.com',
    path: '/ws',
});

await ws.connect();
ws.on('message', (data) => console.log(data));
ws.send('Hello');
```

## Architecture

```
jsurl/
├── bin/
│   └── jsurl.js          # CLI entry point
├── lib/
│   ├── cli/              # Command line interface
│   │   ├── options.js    # CLI options definition
│   │   ├── parser.js     # Argument parser
│   │   └── help.js       # Help message generator
│   ├── http/             # HTTP protocol
│   │   ├── request.js    # Request builder
│   │   ├── response.js   # Response parser
│   │   └── client.js     # HTTP client
│   ├── websocket/        # WebSocket protocol
│   │   ├── frame.js      # Frame parser/builder
│   │   └── client.js     # WebSocket client
│   ├── transport/        # Transport layer
│   │   └── tcp.js        # TCP socket operations
│   ├── cookies/          # Cookie management
│   │   └── manager.js    # Cookie jar operations
│   └── utils/            # Utilities
│       ├── colors.js     # Terminal colors
│       ├── errors.js     # Custom error classes
│       ├── logger.js     # Logging utility
│       └── validators.js # Input validation
└── package.json
```

## Module Responsibilities

### Transport Layer (lib/transport/)

Low-level TCP socket operations. Provides connection management for both HTTP and WebSocket.

- `createConnection()` - Create TCP connection
- `sendAndReceive()` - Send data and wait for response (HTTP)
- `createPersistentConnection()` - Keep connection open (WebSocket)

### HTTP Module (lib/http/)

HTTP/1.1 protocol implementation.

- `buildRequest()` - Build raw HTTP request
- `parseResponse()` - Parse HTTP response
- `sendRequest()` - Send request and receive response

### WebSocket Module (lib/websocket/)

WebSocket protocol (RFC 6455) implementation.

- `createFrame()` - Build WebSocket frame
- `parseFrame()` - Parse WebSocket frame
- `WebSocketClient` - Full WebSocket client with events

### CLI Module (lib/cli/)

Command line interface.

- `parseArgs()` - Parse command line arguments
- `generateHelp()` - Generate help message
- `options` - CLI options definition

## Request Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI (bin/jsurl.js)                       │
│  Parse args -> Create request object -> Send -> Show response  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     HTTP Client (lib/http/)                     │
│  buildRequest() -> Buffer with HTTP request                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Transport (lib/transport/)                    │
│  createConnection() -> sendAndReceive() -> Response buffer     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Target Server or Proxy (e.g. Burp Suite)           │
└─────────────────────────────────────────────────────────────────┘
```

## Dependencies

None. Uses only Node.js internal modules:

- `net` - TCP sockets
- `fs` - File system operations
- `path` - Path utilities
- `crypto` - Cryptographic functions
- `events` - Event emitter (WebSocket)
- `module` - ESM utilities

## Requirements

- Node.js >= 18.0.0

## License

MIT
