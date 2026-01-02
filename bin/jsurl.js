#!/usr/bin/env node

/**
 * jsurl - HTTP/WebSocket Request Tool
 * CLI Entry Point
 * 
 * A raw socket HTTP/WebSocket client for security testing.
 * Uses only Node.js internal modules.
 */

import fs from 'fs';
import readline from 'readline';
import { parseArgs } from '../lib/cli/parser.js';
import { generateHelp, getVersion } from '../lib/cli/help.js';
import { sendRequest, getRequestString } from '../lib/http/client.js';
import { createRequestObject } from '../lib/http/request.js';
import { parseResponse } from '../lib/http/response.js';
import { processResponseCookies } from '../lib/cookies/manager.js';
import { WebSocketClient } from '../lib/websocket/client.js';
import { disableColors, colors } from '../lib/utils/colors.js';
import logger from '../lib/utils/logger.js';
import { parseUrl, isWebSocketUrl, getDefaultPort } from '../lib/utils/validators.js';
import {
    EXIT_CODES,
    ValidationError,
    ConnectionError,
    HttpError,
    TimeoutError,
    WebSocketError,
} from '../lib/utils/errors.js';

/**
 * Handle WebSocket connection
 * @param {object} params - CLI parameters
 * @param {object} urlInfo - Parsed URL info
 */
async function handleWebSocket(params, urlInfo) {
    const host = urlInfo.host;
    const path = urlInfo.path;
    const port = params.port !== 80 ? params.port : (urlInfo.port || getDefaultPort(urlInfo.protocol));
    const isSecure = urlInfo.protocol === 'wss';

    // Parse proxy if provided
    let proxy = null;
    if (params.proxy) {
        const [proxyHost, proxyPort] = params.proxy.split(':');
        proxy = {
            host: proxyHost || '127.0.0.1',
            port: parseInt(proxyPort) || 8080,
        };
    }

    // Log configuration in verbose mode
    if (params.verbose && !params.silent) {
        logger.separator('-');
        logger.title('WebSocket Configuration');
        logger.separator('-');
        logger.info(`Host: ${host}`);
        logger.info(`Path: ${path}`);
        logger.info(`Port: ${port}`);
        logger.info(`Secure: ${isSecure ? 'Yes (wss)' : 'No (ws)'}`);
        if (proxy) {
            logger.info(`Proxy: ${proxy.host}:${proxy.port}`);
        }
        logger.info(`Timeout: ${params.timeout}ms`);
        logger.info(`Listen: ${params.wsListen}ms`);
        if (params.wsSend.length > 0) {
            logger.info(`Messages: ${params.wsSend.length}`);
        }
        if (params.wsInteractive) {
            logger.info(`Mode: Interactive`);
        }
        logger.separator('-');
    }

    // Create WebSocket client
    const ws = new WebSocketClient({
        host,
        port,
        path,
        headers: params.header || [],
        timeout: params.timeout,
        proxy,
    });

    // Track connection state
    let connected = false;
    let messageCount = 0;

    // Output helpers
    const output = {
        send: (msg) => {
            if (params.wsRaw) return;
            console.log(`${colors.yellow}[>]${colors.reset} ${msg}`);
        },
        receive: (msg) => {
            if (params.wsRaw) {
                console.log(msg);
            } else {
                console.log(`${colors.green}[<]${colors.reset} ${msg}`);
            }
        },
        info: (msg) => {
            if (params.wsRaw || params.silent) return;
            logger.info(msg);
        },
        error: (msg) => {
            if (params.wsRaw) {
                console.error(msg);
            } else {
                logger.error(msg);
            }
        },
        success: (msg) => {
            if (params.wsRaw || params.silent) return;
            logger.success(msg);
        },
    };

    return new Promise((resolve, reject) => {
        // Event handlers
        ws.on('open', () => {
            connected = true;
            output.success(`Connected to ws://${host}:${port}${path}`);

            // Send messages
            for (const msg of params.wsSend) {
                output.send(msg);
                ws.send(msg);
            }

            // Send ping if requested
            if (params.wsPing) {
                output.info('Sending ping...');
                ws.ping();
            }

            // Interactive mode
            if (params.wsInteractive) {
                output.info('Interactive mode. Type messages and press Enter. Ctrl+C to exit.');
                
                const rl = readline.createInterface({
                    input: process.stdin,
                    output: process.stdout,
                    prompt: `${colors.cyan}> ${colors.reset}`,
                });

                rl.prompt();

                rl.on('line', (line) => {
                    const trimmed = line.trim();
                    if (trimmed) {
                        if (trimmed === '/quit' || trimmed === '/exit') {
                            output.info('Closing connection...');
                            ws.close();
                            rl.close();
                        } else if (trimmed === '/ping') {
                            output.info('Sending ping...');
                            ws.ping();
                        } else {
                            output.send(trimmed);
                            ws.send(trimmed);
                        }
                    }
                    rl.prompt();
                });

                rl.on('close', () => {
                    if (connected) {
                        ws.close();
                    }
                });

                // Don't auto-close in interactive mode
                return;
            }

            // Auto-close after listen time (if not interactive and not waiting forever)
            if (params.wsListen > 0) {
                setTimeout(() => {
                    if (connected) {
                        output.info('Listen timeout reached. Closing...');
                        ws.close();
                    }
                }, params.wsListen);
            }
        });

        ws.on('message', (data) => {
            messageCount++;
            output.receive(data);

            // Save to file if specified
            if (params.output) {
                const content = typeof data === 'string' ? data : data.toString();
                fs.appendFileSync(params.output, content + '\n');
            }
        });

        ws.on('ping', (data) => {
            if (!params.wsRaw && !params.silent) {
                logger.info(`Ping received${data.length > 0 ? `: ${data}` : ''}`);
            }
        });

        ws.on('pong', (data) => {
            if (!params.wsRaw && !params.silent) {
                logger.info(`Pong received${data.length > 0 ? `: ${data}` : ''}`);
            }
        });

        ws.on('close', () => {
            connected = false;
            output.info(`Connection closed. Messages received: ${messageCount}`);
            resolve(EXIT_CODES.SUCCESS);
        });

        ws.on('error', (err) => {
            connected = false;
            output.error(`WebSocket error: ${err.message}`);
            reject(new WebSocketError(err.message));
        });

        // Connect
        output.info(`Connecting to ws://${host}:${port}${path}...`);
        
        ws.connect().catch((err) => {
            reject(err);
        });
    });
}

/**
 * Handle HTTP request
 * @param {object} params - CLI parameters
 * @param {object} urlInfo - Parsed URL info
 */
async function handleHttp(params, urlInfo) {
    const host = urlInfo.host;
    const path = urlInfo.path;
    const port = params.port !== 80 ? params.port : (urlInfo.port || 80);

    // Create request object
    const requestObj = createRequestObject({
        ...params,
        host,
        path,
        port,
    });

    // Verbose logging
    if (params.verbose && !params.silent) {
        logger.separator('-');
        logger.title('Request Configuration');
        logger.separator('-');
        logger.info(`Host: ${host}`);
        logger.info(`Path: ${path}`);
        logger.info(`Port: ${requestObj.port}`);
        logger.info(`Method: ${requestObj.method}`);
        if (requestObj.proxy && requestObj.proxy.host) {
            logger.info(`Proxy: ${requestObj.proxy.host}:${requestObj.proxy.port}`);
        } else {
            logger.info(`Proxy: (none - direct connection)`);
        }
        logger.info(`Timeout: ${requestObj.timeout}ms`);
        
        if (requestObj.data) {
            logger.info(`Body: ${requestObj.data}`);
        }
        if (requestObj.form && requestObj.form.length > 0) {
            logger.info(`Form: ${requestObj.form.length} field(s)`);
        }
        if (requestObj.cookie) {
            logger.info(`Cookie: ${requestObj.cookie}`);
        }
        if (requestObj.headers.length > 0) {
            logger.info(`Headers: ${requestObj.headers.join(', ')}`);
        }
        if (requestObj.output) {
            logger.info(`Output: ${requestObj.output}`);
        }
        
        logger.separator('-');
        logger.title('HTTP Request');
        logger.separator('-');
        console.log(getRequestString(requestObj));
    }

    // Send request
    if (!params.silent) {
        const useProxy = requestObj.proxy && requestObj.proxy.host;
        const connectTarget = useProxy 
            ? `${requestObj.proxy.host}:${requestObj.proxy.port} (proxy)`
            : `${host}:${requestObj.port}`;
        logger.info(`Connecting to ${connectTarget}...`);
    }

    const response = await sendRequest(requestObj);

    // Parse response
    const parsedResponse = parseResponse(response);

    // Response logging
    if (params.verbose && !params.silent) {
        logger.separator('-');
        logger.title('HTTP Response');
        logger.separator('-');
    }

    // Save to file if specified
    if (requestObj.output) {
        fs.writeFileSync(requestObj.output, parsedResponse.body);
        if (!params.silent) {
            logger.success(`Response saved to ${requestObj.output}`);
        }
    }

    // Show response
    if (params.silent) {
        // Silent mode: only body
        console.log(parsedResponse.body);
    } else if (params.verbose) {
        // Verbose mode: full response
        console.log(response);
    } else {
        // Normal mode: status + body
        const statusColor = parsedResponse.statusCode < 400 ? colors.green : colors.red;
        logger.success(`Status: ${statusColor}${parsedResponse.statusCode} ${parsedResponse.statusText}${colors.reset}`);
        if (!requestObj.output) {
            console.log(parsedResponse.body);
        }
    }

    // Process cookies
    if (params.cookieJar) {
        const { saved } = processResponseCookies(response, params.cookieJar, host);
        if (saved > 0 && !params.silent) {
            logger.success(`${saved} cookie(s) saved to ${params.cookieJar}`);
        }
    }

    // Exit code based on HTTP status
    if (parsedResponse.isClientError && parsedResponse.isClientError()) {
        return EXIT_CODES.HTTP_ERROR;
    }
    if (parsedResponse.isServerError && parsedResponse.isServerError()) {
        return EXIT_CODES.HTTP_ERROR;
    }

    return EXIT_CODES.SUCCESS;
}

/**
 * Main function
 */
async function main() {
    // Show help if no arguments
    const hasArgs = process.argv.length > 2;
    
    if (!hasArgs) {
        console.log(generateHelp());
        process.exit(EXIT_CODES.SUCCESS);
    }

    const { params, errors } = parseArgs(process.argv);

    // Disable colors if requested
    if (params.noColor) {
        disableColors();
    }

    // Show version
    if (params.version) {
        console.log(getVersion());
        process.exit(EXIT_CODES.SUCCESS);
    }

    // Show help
    if (params.help) {
        console.log(generateHelp());
        process.exit(EXIT_CODES.SUCCESS);
    }

    // Validation errors
    if (errors.length > 0) {
        console.log(`${colors.red}Errors:${colors.reset}`);
        errors.forEach(err => console.log(`  ${colors.red}x${colors.reset} ${err}`));
        console.log(`\nUse ${colors.cyan}jsurl -h${colors.reset} to see available options.`);
        process.exit(EXIT_CODES.VALIDATION_ERROR);
    }

    // Parse URL to extract host, path, port, and protocol
    const urlInfo = parseUrl(params.host);

    try {
        let exitCode;

        // Detect WebSocket mode
        if (urlInfo.isWebSocket || isWebSocketUrl(params.host)) {
            exitCode = await handleWebSocket(params, urlInfo);
        } else {
            exitCode = await handleHttp(params, urlInfo);
        }

        process.exit(exitCode);

    } catch (err) {
        if (err instanceof ValidationError) {
            logger.error(`Validation: ${err.message}`);
            process.exit(EXIT_CODES.VALIDATION_ERROR);
        }
        
        if (err instanceof ConnectionError) {
            logger.error(`Connection: ${err.message}`);
            process.exit(EXIT_CODES.CONNECTION_ERROR);
        }
        
        if (err instanceof TimeoutError) {
            logger.error(`Timeout: ${err.message}`);
            process.exit(EXIT_CODES.TIMEOUT_ERROR);
        }
        
        if (err instanceof HttpError) {
            logger.error(`HTTP: ${err.message}`);
            process.exit(EXIT_CODES.HTTP_ERROR);
        }

        if (err instanceof WebSocketError) {
            logger.error(`WebSocket: ${err.message}`);
            process.exit(EXIT_CODES.WEBSOCKET_ERROR);
        }

        // Unknown error
        logger.error(`Error: ${err.message}`);
        if (params.verbose) {
            console.error(err.stack);
        }
        process.exit(EXIT_CODES.UNKNOWN_ERROR);
    }
}

// Execute
main();
