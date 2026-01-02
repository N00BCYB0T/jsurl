/**
 * Logger utility with colors and levels
 */

import { colors } from './colors.js';

const logger = {
    info: (msg) => console.log(`${colors.cyan}[*]${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}[+]${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}[!]${colors.reset} ${msg}`),
    error: (msg) => console.error(`${colors.red}[x]${colors.reset} ${msg}`),
    debug: (msg) => console.log(`${colors.gray}[DEBUG]${colors.reset} ${msg}`),
    
    // Raw output without prefix
    raw: (msg) => console.log(msg),
    
    // Separator line
    separator: (char = '=', length = 60) => {
        console.log(char.repeat(length));
    },
    
    // Highlighted title
    title: (msg) => {
        console.log(`${colors.cyan}${msg}${colors.reset}`);
    },
};

export default logger;
