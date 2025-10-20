const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Determine status code
  const statusCode = err.statusCode || err.response?.status || 500;

  // Prepare error response
  const errorResponse = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR'
    }
  };

  // Include additional error details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack;
  }

  // If it's a Binance API error, pass through the response
  if (err.response?.data) {
    errorResponse.error.binanceError = err.response.data;
  }

  res.status(statusCode).json(errorResponse);
}

module.exports = errorHandler;
