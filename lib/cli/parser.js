/**
 * Command line argument parser
 */

import { options, positionalOrder } from './options.js';

/**
 * Parse command line arguments
 * @param {string[]} argv - Argument array (process.argv)
 * @returns {{ params: object, errors: string[] }}
 */
export function parseArgs(argv) {
    const args = argv.slice(2);
    const result = {};
    const errors = [];
    
    // Initialize with default values
    for (const [key, def] of Object.entries(options)) {
        if (def.default !== undefined) {
            result[key] = def.type === 'array' ? [...def.default] : def.default;
        }
    }
    
    // Process arguments
    let i = 0;
    const positionalArgs = [];
    
    while (i < args.length) {
        const arg = args[i];
        let foundFlag = false;
        
        // Check if it's a known flag
        for (const [key, def] of Object.entries(options)) {
            if (def.flags.includes(arg)) {
                foundFlag = true;
                
                if (def.type === 'boolean') {
                    result[key] = true;
                } else {
                    // Get next argument as value
                    i++;
                    if (i >= args.length) {
                        errors.push(`Flag ${arg} requires a value`);
                        break;
                    }
                    
                    const value = args[i];
                    
                    if (def.type === 'number') {
                        const num = parseInt(value);
                        if (isNaN(num)) {
                            errors.push(`${arg} must be a number (got: ${value})`);
                        } else {
                            result[key] = num;
                        }
                    } else if (def.type === 'array') {
                        result[key].push(value);
                    } else if (def.multiple) {
                        const sep = def.separator || '&';
                        if (result[key]) {
                            result[key] += sep + value;
                        } else {
                            result[key] = value;
                        }
                    } else {
                        result[key] = value;
                    }
                }
                break;
            }
        }
        
        // If not a known flag
        if (!foundFlag) {
            if (arg.startsWith('-')) {
                errors.push(`Unknown flag: ${arg}`);
            } else {
                positionalArgs.push(arg);
            }
        }
        
        i++;
    }
    
    // Map positional arguments (compatibility)
    positionalArgs.forEach((val, idx) => {
        if (idx < positionalOrder.length) {
            const key = positionalOrder[idx];
            const def = options[key];
            
            if (def) {
                if (def.type === 'number') {
                    const num = parseInt(val);
                    if (!isNaN(num)) {
                        result[key] = num;
                    }
                } else {
                    result[key] = val;
                }
            }
        }
    });
    
    // Check required fields
    for (const [key, def] of Object.entries(options)) {
        if (def.required && !result[key]) {
            errors.push(`Required parameter: ${def.flags[0]} (${def.description})`);
        }
    }
    
    return { params: result, errors };
}
