# jsurl Roadmap

## v1.0.0 (Current)
- Basic HTTP client with raw sockets
- CLI interface
- Proxy support
- Cookie management
- Multipart file upload
- WebSocket client (basic)

## v1.1.0 (Next)

### High Priority
- [ ] HTTPS/TLS support (using Node.js `tls` module)
- [ ] Follow redirects (-L/--location)
- [ ] Basic authentication (-u/--user)

### Medium Priority
- [ ] Chunked transfer encoding decode
- [ ] SOCKS proxy support
- [ ] Compressed responses (gzip/deflate)
- [ ] Load cookies from file (-b @file)

### Low Priority
- [ ] HTTP/2 support
- [ ] Retry logic (--retry)
- [ ] Connection reuse (keep-alive)
- [ ] Rate limiting

## Backlog

### Features
- Resume downloads (-C/--continue-at)
- Progress bar for uploads/downloads
- Request timing breakdown
- Multiple URL support
- Config file support

### Improvements
- Better error messages
- Response body syntax highlighting
- Request history

### Bug Fixes
(none reported yet)

## Out of Scope
- FTP/SFTP/SCP protocols
- Email protocols (SMTP, IMAP)
- LDAP

