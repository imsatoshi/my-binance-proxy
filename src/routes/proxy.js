const express = require('express');
const router = express.Router();
const binanceClient = require('../services/binanceClient');
const logger = require('../utils/logger');

/**
 * Proxy all requests to Binance API
 * Supports: GET, POST, PUT, DELETE methods
 * Handles: /api/*, /sapi/*, /wapi/*, /fapi/*, /dapi/*
 */
router.all('*', async (req, res, next) => {
  try {
    const method = req.method;

    // Reconstruct the full API path
    // req.baseUrl contains the matched prefix (/api, /sapi, etc.)
    // req.path contains the rest of the path
    const endpoint = req.baseUrl + req.path;

    const params = { ...req.query, ...req.body };

    logger.info(`Proxying ${method} request`, {
      endpoint,
      baseUrl: req.baseUrl,
      path: req.path,
      fullUrl: req.originalUrl,
      hasParams: Object.keys(params).length > 0,
      ip: req.ip
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
