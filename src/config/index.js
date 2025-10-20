require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 8080,
    host: process.env.HOST || '0.0.0.0'
  },
  binance: {
    apiUrl: process.env.BINANCE_API_URL || 'https://api.binance.com',
    apiKey: process.env.BINANCE_API_KEY || '',
    secretKey: process.env.BINANCE_SECRET_KEY || ''
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableRequestLog: process.env.ENABLE_REQUEST_LOG === 'true'
  }
};
