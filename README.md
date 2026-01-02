# jsurl

**Raw Socket HTTP/WebSocket Client for Security Testing**

A versatile command-line tool for HTTP requests and WebSocket connections using raw TCP sockets. Built with zero external dependencies using only Node.js built-in modules.

## Features

- **Raw TCP Socket Connections** - Direct socket control for security testing
- **HTTP/1.1 Protocol Support** - Full request/response handling
- **WebSocket Client** - RFC 6455 compliant with interactive mode
- **Multipart Form-Data** - File uploads with custom filenames
- **Cookie Management** - Netscape format cookie jar
- **Proxy Support** - HTTP proxies, Burp Suite integration
- **Interactive WebSocket Mode** - Real-time bidirectional communication
- **Colored Output** - Beautiful terminal output
- **Zero Dependencies** - Uses only Node.js built-in modules

## Installation

```bash
# Clone or copy to your project
cd jsurl

# Link globally
npm link

# Or run directly
node bin/jsurl.js
```

## Usage

```bash
jsurl -u <url> [options]
```

### Request Options

| Flag | Description | Default |
|------|-------------|---------|
| `-u`, `--url` | Target URL (http://, https://, ws://, wss://) | required |
| `-X`, `--method` | HTTP method (GET, POST, PUT, DELETE, etc.) | GET |
| `-d`, `--data` | Request body data | - |
| `-F`, `--form` | Form field (file=@path or name=value) | - |
| `-H`, `--header` | Custom header | - |
| `-b`, `--cookie` | Cookie to send | - |
| `-c`, `--cookie-jar` | File to save received cookies | - |
| `-x`, `--proxy` | Proxy in host:port format | - |
| `-p`, `--port` | Target port | 80 |
| `-t`, `--timeout` | Timeout in milliseconds | 10000 |

### WebSocket Options

| Flag | Description | Default |
|------|-------------|---------|
| `-m`, `--message` | Message to send (can repeat) | - |
| `-l`, `--listen` | Listen time in ms (0 = until close) | 2000 |
| `-i`, `--interactive` | Interactive mode (read from stdin) | false |
| `--ping` | Send ping frame | false |
| `-r`, `--raw` | Raw output (messages only) | false |

### Output Options

| Flag | Description | Default |
|------|-------------|---------|
| `-v`, `--verbose` | Verbose output | false |
| `-s`, `--silent` | Silent mode | false |
| `-n`, `--no-color` | Disable colored output | false |
| `-o`, `--output` | Save response to file | - |
| `-h`, `--help` | Show help message | - |
| `-V`, `--version` | Show version | - |

## Examples

### HTTP Requests

```bash
# Simple GET request
jsurl -u example.com/api
# → {"status": "ok"}

# POST with form data
jsurl -u example.com/login -X POST -d "user=admin&pass=123"
# → {"token": "abc123"}

# POST with JSON
jsurl -u example.com/api -X POST -d '{"key":"value"}' -H "Content-Type: application/json"

# File upload
jsurl -u example.com/upload -X POST -F "file=@/path/to/file.txt"

# File upload with path traversal
jsurl -u example.com/upload -X POST -F "file=@local.txt;filename=../../etc/passwd"

# Multiple form fields
jsurl -u example.com/upload -X POST -F "file=@photo.jpg" -F "name=photo" -F "desc=test"

# Custom headers
jsurl -u example.com/api -H "Authorization: Bearer token" -H "X-Custom: value"

# With cookies
jsurl -u example.com/dashboard -b "session=abc123; token=xyz"

# Via proxy (Burp Suite)
jsurl -u example.com/api -x 127.0.0.1:8080

# Save response to file
jsurl -u example.com/api -o response.txt

# Verbose mode
jsurl -u example.com/api -v
```

### WebSocket

```bash
# Connect and send message
jsurl -u ws://example.com/ws -m "hello"
# → {"response": "world"}

# Send multiple messages
jsurl -u ws://example.com/ws -m "msg1" -m "msg2" -m "msg3"

# Listen longer for responses (5 seconds)
jsurl -u ws://example.com/ws -m "key" -l 5000

# Interactive mode
jsurl -u ws://example.com/ws -i

# Raw output (messages only)
jsurl -u ws://example.com/ws -m "key" -r
# → secret_flag_here

# With custom headers
jsurl -u ws://example.com/ws -m "auth" -H "Authorization: Bearer token"

# Via proxy
jsurl -u ws://example.com/ws -m "test" -x 127.0.0.1:8080

# Send ping frame
jsurl -u ws://example.com/ws --ping

# Verbose mode
jsurl -u ws://example.com/ws -m "debug" -v
```

### Interactive Mode Commands

When in interactive mode (`-i`), you can use these special commands:

| Command | Description |
|---------|-------------|
| `/quit` or `/exit` | Close connection |
| `/ping` | Send ping frame |
| `/help` | Show available commands |

### Practical Security Testing Examples

```bash
# Test path traversal in file upload
jsurl -u target.com/upload -X POST -F "file=@shell.php;filename=../../../var/www/shell.php"

# Send SSRF payload
jsurl -u target.com/fetch -X POST -d "url=http://169.254.169.254/latest/meta-data/"

# Test WebSocket injection
jsurl -u ws://target.com/chat -m '{"type":"message","content":"<script>alert(1)</script>"}'

# Capture session via proxy
jsurl -u target.com/login -X POST -d "user=admin&pass=test" -x 127.0.0.1:8080

# Test CRLF injection
jsurl -u target.com/redirect -H $'X-Injected: true\r\nSet-Cookie: admin=1'

# WebSocket with auth bypass
jsurl -u ws://target.com/admin -m "list_users" -H "X-Admin: true"
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | Validation error |
| 2 | Connection error |
| 3 | HTTP error (4xx/5xx) |
| 4 | Timeout |
| 5 | WebSocket error |
| 99 | Unknown error |

## Proxy Support

Both HTTP and WebSocket support proxies (`-x` flag), but they work differently:

### HTTP Proxy

HTTP requests use forward proxy mode. The request is sent directly to the proxy with an absolute URL:

```
Client → Proxy → Target
         GET http://target.com/path HTTP/1.1
```

### WebSocket Proxy

WebSocket uses HTTP CONNECT tunnel. A tunnel is established first, then WebSocket handshake occurs:

```
Client → Proxy → CONNECT target:80 → 200 OK → WS Handshake → Target
```

### Burp Suite Tips

1. Both HTTP and WebSocket traffic will appear in Burp
2. HTTP: **Proxy → HTTP history**
3. WebSocket: **Proxy → WebSockets history**
4. Enable "Intercept WebSocket messages" in Proxy settings

## API Usage

You can also use jsurl as a library in your Node.js projects:

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
ws.close();
```

## Technical Details

### HTTP Protocol

- Follows HTTP/1.1 specification
- Supports chunked transfer encoding
- Cookie management in Netscape format
- Multipart/form-data for file uploads

### WebSocket Protocol

- Follows RFC 6455
- Supports text and binary frames
- Automatic ping/pong handling
- Masking for client-to-server frames

### Proxy Modes

- **HTTP Forward Proxy** - Absolute URL in request line
- **HTTP CONNECT Tunnel** - For WebSocket and HTTPS

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

## Dependencies

None. Uses only Node.js internal modules:

- `net` - TCP sockets
- `fs` - File system operations
- `path` - Path utilities
- `crypto` - Cryptographic functions
- `events` - Event emitter (WebSocket)
- `readline` - Interactive mode
- `module` - ESM utilities

## Requirements

- Node.js >= 18.0.0

## License

MIT

---

Made for security professionals
