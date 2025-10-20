require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 8080,
    host: process.env.HOST || '0.0.0.0'
  },
  binance: {
    // Spot API
    spotApiUrl: process.env.BINANCE_SPOT_API_URL || 'https://api.binance.com',
    // USDT-M Futures API
    futuresApiUrl: process.env.BINANCE_FUTURES_API_URL || 'https://fapi.binance.com',
    // COIN-M Delivery API
    deliveryApiUrl: process.env.BINANCE_DELIVERY_API_URL || 'https://dapi.binance.com',

    apiKey: process.env.BINANCE_API_KEY || '',
    secretKey: process.env.BINANCE_SECRET_KEY || ''
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableRequestLog: process.env.ENABLE_REQUEST_LOG === 'true'
  }
};
