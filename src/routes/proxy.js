const express = require('express');
const router = express.Router();
const binanceClient = require('../services/binanceClient');
const logger = require('../utils/logger');

/**
 * Proxy all requests to Binance API
 * Supports: GET, POST, PUT, DELETE methods
 */
router.all('*', async (req, res, next) => {
  try {
    // Skip health check endpoint
    if (req.path === '/health') {
      return next();
    }

    const method = req.method;
    // Use the full path as-is from the request
    const endpoint = req.path;
    const params = { ...req.query, ...req.body };

    logger.info(`Proxying ${method} request`, {
      endpoint,
      fullUrl: req.originalUrl,
      params: Object.keys(params).length > 0 ? params : 'none',
      ip: req.ip,
      userAgent: req.get('user-agent')
    });

    // Forward request to Binance
    const response = await binanceClient.forwardRequest(
      method,
      endpoint,
      params,
      {
        'User-Agent': req.get('user-agent') || 'Binance-Proxy/1.0'
      }
    );

    // Set response headers
    if (response.headers['content-type']) {
      res.set('Content-Type', response.headers['content-type']);
    }

    // Send response
    res.status(response.status).json(response.data);

  } catch (error) {
    next(error);
  }
});

module.exports = router;
