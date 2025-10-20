const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

class BinanceClient {
  constructor() {
    this.spotApiUrl = config.binance.spotApiUrl;
    this.futuresApiUrl = config.binance.futuresApiUrl;
    this.deliveryApiUrl = config.binance.deliveryApiUrl;
    this.apiKey = config.binance.apiKey;
    this.secretKey = config.binance.secretKey;
  }

  /**
   * Get the appropriate base URL based on endpoint
   */
  _getBaseUrl(endpoint) {
    if (endpoint.startsWith('/fapi')) {
      return this.futuresApiUrl;
    } else if (endpoint.startsWith('/dapi')) {
      return this.deliveryApiUrl;
    } else {
      return this.spotApiUrl;
    }
  }

  /**
   * Create axios client with appropriate base URL
   */
  _createClient(baseURL) {
    return axios.create({
      baseURL,
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
      // Get the appropriate base URL
      const baseURL = this._getBaseUrl(endpoint);
      const client = this._createClient(baseURL);

      // Determine if request requires signature
      const requiresSignature = this._requiresSignature(endpoint);

      logger.debug('Forwarding request to Binance', {
        method,
        endpoint,
        baseURL,
        params,
        requiresSignature
      });

      const requestConfig = this._prepareRequest(method, endpoint, params, requiresSignature);

      // Add custom headers
      if (headers) {
        requestConfig.headers = {
          ...client.defaults.headers,
          ...headers
        };
      }

      const response = await client.request(requestConfig);

      logger.debug('Received response from Binance', {
        status: response.status,
        endpoint,
        baseURL
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
      // Spot API
      '/api/v3/order',
      '/api/v3/openOrders',
      '/api/v3/allOrders',
      '/api/v3/account',
      '/api/v3/myTrades',
      '/sapi/',
      '/wapi/',
      // Futures API
      '/fapi/v1/order',
      '/fapi/v1/openOrders',
      '/fapi/v1/allOrders',
      '/fapi/v1/account',
      '/fapi/v1/balance',
      '/fapi/v1/positionRisk',
      '/fapi/v1/userTrades',
      '/fapi/v2/account',
      '/fapi/v2/balance',
      '/fapi/v2/positionRisk',
      // Delivery API
      '/dapi/v1/order',
      '/dapi/v1/openOrders',
      '/dapi/v1/allOrders',
      '/dapi/v1/account',
      '/dapi/v1/balance',
      '/dapi/v1/positionRisk'
    ];

    return signedEndpoints.some(signedEndpoint => endpoint.includes(signedEndpoint));
  }
}

module.exports = new BinanceClient();
