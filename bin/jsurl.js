#!/usr/bin/env node

/**
 * jsurl - HTTP Request Tool
 * CLI Entry Point
 * 
 * A raw socket HTTP client for security testing.
 * Uses only Node.js internal modules.
 */

import fs from 'fs';
import { parseArgs } from '../lib/cli/parser.js';
import { generateHelp, getVersion } from '../lib/cli/help.js';
import { sendRequest, getRequestString } from '../lib/http/client.js';
import { createRequestObject } from '../lib/http/request.js';
import { parseResponse } from '../lib/http/response.js';
import { processResponseCookies } from '../lib/cookies/manager.js';
import { disableColors, colors } from '../lib/utils/colors.js';
import logger from '../lib/utils/logger.js';
import { parseUrl } from '../lib/utils/validators.js';
import {
    EXIT_CODES,
    ValidationError,
    ConnectionError,
    HttpError,
    TimeoutError,
} from '../lib/utils/errors.js';

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

    // Parse URL to extract host, path, and port
    const urlInfo = parseUrl(params.host);
    
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

    try {
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
            process.exit(EXIT_CODES.HTTP_ERROR);
        }
        if (parsedResponse.isServerError && parsedResponse.isServerError()) {
            process.exit(EXIT_CODES.HTTP_ERROR);
        }

        process.exit(EXIT_CODES.SUCCESS);

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
