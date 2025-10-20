const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

class BinanceClient {
  constructor() {
    this.apiUrl = config.binance.apiUrl;
    this.apiKey = config.binance.apiKey;
    this.secretKey = config.binance.secretKey;

    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'X-MBX-APIKEY': this.apiKey
      }
    });
  }

  /**
   * Generate signature for authenticated requests
   */
  _generateSignature(queryString) {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
  }

  /**
   * Build query string from parameters
   */
  _buildQueryString(params) {
    return Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
  }

  /**
   * Prepare request with signature if needed
   */
  _prepareRequest(method, endpoint, params = {}, requiresSignature = false) {
    let queryString = '';
    let requestParams = { ...params };

    if (Object.keys(requestParams).length > 0) {
      queryString = this._buildQueryString(requestParams);
    }

    // Add timestamp for authenticated requests
    if (requiresSignature) {
      const timestamp = Date.now();
      requestParams.timestamp = timestamp;

      if (queryString) {
        queryString += `&timestamp=${timestamp}`;
      } else {
        queryString = `timestamp=${timestamp}`;
      }

      // Generate signature
      const signature = this._generateSignature(queryString);
      requestParams.signature = signature;
    }

    // For GET requests, use query parameters
    // For POST/PUT/DELETE, may need to use body or query depending on endpoint
    const config = {
      method,
      url: endpoint
    };

    if (method === 'GET') {
      config.params = requestParams;
    } else if (method === 'POST' || method === 'PUT') {
      // For signed requests, params go in query string
      if (requiresSignature) {
        config.params = requestParams;
      } else {
        config.data = requestParams;
      }
    } else if (method === 'DELETE') {
      config.params = requestParams;
    }

    return config;
  }

  /**
   * Forward request to Binance API
   */
  async forwardRequest(method, endpoint, params = {}, headers = {}) {
    try {
      // Determine if request requires signature
      const requiresSignature = this._requiresSignature(endpoint);

      logger.debug('Forwarding request to Binance', {
        method,
        endpoint,
        params,
        requiresSignature
      });

      const requestConfig = this._prepareRequest(method, endpoint, params, requiresSignature);

      // Add custom headers
      if (headers) {
        requestConfig.headers = {
          ...this.client.defaults.headers,
          ...headers
        };
      }

      const response = await this.client.request(requestConfig);

      logger.debug('Received response from Binance', {
        status: response.status,
        endpoint
      });

      return {
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      logger.error('Binance API request failed', {
        message: error.message,
        endpoint,
        status: error.response?.status,
        data: error.response?.data
      });

      throw error;
    }
  }

  /**
   * Determine if endpoint requires signature
   */
  _requiresSignature(endpoint) {
    const signedEndpoints = [
      '/api/v3/order',
      '/api/v3/openOrders',
      '/api/v3/allOrders',
      '/api/v3/account',
      '/api/v3/myTrades',
      '/sapi/',
      '/wapi/'
    ];

    return signedEndpoints.some(signedEndpoint => endpoint.includes(signedEndpoint));
  }
}

module.exports = new BinanceClient();
