const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const proxyRoutes = require('./routes/proxy');
const cacheService = require('./services/cacheService');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (disabled for less verbose output)
// if (config.logging.enableRequestLog) {
//   app.use(morgan('combined'));
// }

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'binance-proxy',
    cache: cacheService.getStats()
  });
});

// Cache stats endpoint
app.get('/cache/stats', (req, res) => {
  res.json(cacheService.getStats());
});

// Clear cache endpoint (for debugging)
app.post('/cache/clear', (req, res) => {
  cacheService.clear();
  res.json({
    status: 'ok',
    message: 'Cache cleared successfully'
  });
});

// Proxy all Binance API routes
app.use('/api', proxyRoutes);
app.use('/sapi', proxyRoutes);
app.use('/wapi', proxyRoutes);
app.use('/dapi', proxyRoutes);
app.use('/fapi', proxyRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(config.server.port, config.server.host, () => {
  logger.info(`Binance Proxy Server started on ${config.server.host}:${config.server.port}`);
  logger.info(`Spot API: ${config.binance.spotApiUrl}`);
  logger.info(`Futures API: ${config.binance.futuresApiUrl}`);
  logger.info(`Delivery API: ${config.binance.deliveryApiUrl}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
