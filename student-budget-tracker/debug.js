// Centralized diagnostics. Keep disabled in production.
const DEBUG_MODE = false;

function debugLog(...args) {
    if (DEBUG_MODE) console.log(...args);
}

function debugWarn(...args) {
    if (DEBUG_MODE) console.warn(...args);
}

function debugInfo(...args) {
    if (DEBUG_MODE) console.info(...args);
}

window.DEBUG_MODE = DEBUG_MODE;
window.debugLog = debugLog;
window.debugWarn = debugWarn;
window.debugInfo = debugInfo;
