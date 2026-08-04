/**
 * Express application (no listener here — see server.js).
 * Order: security/parsers -> static uploads -> API routes -> 404 -> errors.
 */
const path = require('path');
const express = require('express');
const cors = require('cors');

const apiRoutes = require('./routes');
const requestLogger = require('./logs/requestLogger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// CORS — allow the Vite dev client (CLIENT_URL) with credentials.
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging (writes to logs/app-YYYY-MM-DD.log)
app.use(requestLogger);

// Serve uploaded files (avatars, documents, certificates, ...)
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// API
app.use('/api', apiRoutes);

// Fallbacks
app.use(notFound);
app.use(errorHandler);

module.exports = app;
