/**
 * Lightweight file + console logger (no external deps).
 *
 * Levels: error < warn < info < debug. Set LOG_LEVEL in .env (default: info).
 * Every message is printed to the console AND appended to a daily rotating
 * file in this folder: logs/app-YYYY-MM-DD.log
 *
 *   const logger = require('./logs/logger');
 *   logger.info('Server started', { port: 5000 });
 *   logger.error('DB failure', err);
 */
const fs = require('fs');
const path = require('path');

const LOG_DIR = __dirname;
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CURRENT = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function timestamp() {
  return new Date().toISOString();
}

function logFilePath() {
  const day = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `app-${day}.log`);
}

function formatMeta(meta) {
  if (meta === undefined) return '';
  if (meta instanceof Error) return ` ${meta.stack || meta.message}`;
  if (typeof meta === 'object') {
    try { return ` ${JSON.stringify(meta)}`; } catch { return ' [unserializable meta]'; }
  }
  return ` ${meta}`;
}

function write(level, message, meta) {
  if (LEVELS[level] > CURRENT) return;

  const entry = `[${timestamp()}] ${level.toUpperCase()} ${message}${formatMeta(meta)}`;

  // Console (route error/warn to stderr).
  // eslint-disable-next-line no-console
  (level === 'error' || level === 'warn' ? console.error : console.log)(entry);

  // File (best-effort — never throw from logging).
  fs.appendFile(logFilePath(), `${entry}\n`, (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error(`[logger] failed to write log file: ${err.message}`);
    }
  });
}

module.exports = {
  error: (msg, meta) => write('error', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  debug: (msg, meta) => write('debug', msg, meta),
};
