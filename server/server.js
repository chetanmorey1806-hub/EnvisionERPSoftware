/**
 * Server bootstrap: load env, verify DB, start listening.
 * A failed DB connection logs a warning but does NOT prevent boot — API
 * endpoints that need the DB surface a clean 503 via the error handler.
 */
require('dotenv').config();
const http = require('http');
const app = require('./app');
const { testConnection } = require('./config/db');
const { initSocket } = require('./config/socket');
const scheduler = require('./jobs/scheduler');
const logger = require('./logs/logger');

const PORT = Number(process.env.PORT) || 5000;

(async () => {
  const dbOk = await testConnection();
  if (dbOk) logger.info('[db] Connected to MySQL.');
  else logger.warn('[db] MySQL not reachable — run `npm run db:setup` and check .env.');

  // Wrap Express in an HTTP server so Socket.IO can share the same port.
  const server = http.createServer(app);
  initSocket(server);
  logger.info('[socket] Real-time gateway initialized.');

  // The nightly pass: overdue fees + fines, risk recompute, reminder emails.
  // Only arm it if the DB is actually there — otherwise every wake-up would
  // just log a connection failure.
  if (dbOk) scheduler.start();

  server.listen(PORT, () => {
    logger.info(`[server] Envision ERP API listening on http://localhost:${PORT}/api`);
  });
})();
