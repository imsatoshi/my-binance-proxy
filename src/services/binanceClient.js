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
    const config = {
      method,
      url: endpoint
    };

    // Add timestamp for authenticated requests
    if (requiresSignature) {
      const timestamp = Date.now();

      // Build params with timestamp first
      const allParams = {
        ...params,
        timestamp: timestamp
      };

      // Build query string for signature calculation
      const queryString = this._buildQueryString(allParams);

      // Generate signature
      const signature = this._generateSignature(queryString);

      // Add signature to params
      const signedParams = {
        ...allParams,
        signature: signature
      };

      // For signed requests, always use query parameters (Binance requirement)
      config.params = signedParams;
    } else {
      // For non-signed requests
      if (method === 'GET' || method === 'DELETE') {
        config.params = params;
      } else {
        config.data = params;
      }
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

      const requestConfig = this._prepareRequest(method, endpoint, params, requiresSignature);

      // Debug logging for signed requests
      if (requiresSignature) {
        logger.debug('Signed request details', {
          method,
          endpoint,
          params: requestConfig.params || requestConfig.data,
          hasTimestamp: !!(requestConfig.params?.timestamp || requestConfig.data?.timestamp),
          hasSignature: !!(requestConfig.params?.signature || requestConfig.data?.signature)
        });
      }

      // Add custom headers
      if (headers) {
        requestConfig.headers = {
          ...client.defaults.headers,
          ...headers
        };
      }

      const response = await client.request(requestConfig);

      // logger.debug('Received response from Binance', {
      //   status: response.status,
      //   endpoint,
      //   baseURL
      // });

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
      // Futures API - Trading
      '/fapi/v1/order',
      '/fapi/v1/batchOrders',
      '/fapi/v1/openOrders',
      '/fapi/v1/allOrders',
      '/fapi/v1/countdownCancelAll',
      // Futures API - Account & Positions
      '/fapi/v1/account',
      '/fapi/v1/balance',
      '/fapi/v1/positionRisk',
      '/fapi/v1/positionSide/dual',
      '/fapi/v1/positionMargin',
      '/fapi/v1/userTrades',
      '/fapi/v1/income',
      '/fapi/v1/commissionRate',
      // Futures API - Leverage & Margin
      '/fapi/v1/leverage',
      '/fapi/v1/marginType',
      '/fapi/v1/leverageBracket',
      // Futures API - V2 endpoints
      '/fapi/v2/account',
      '/fapi/v2/balance',
      '/fapi/v2/positionRisk',
      // Delivery API - Trading
      '/dapi/v1/order',
      '/dapi/v1/batchOrders',
      '/dapi/v1/openOrders',
      '/dapi/v1/allOrders',
      '/dapi/v1/countdownCancelAll',
      // Delivery API - Account & Positions
      '/dapi/v1/account',
      '/dapi/v1/balance',
      '/dapi/v1/positionRisk',
      '/dapi/v1/positionSide/dual',
      '/dapi/v1/positionMargin',
      '/dapi/v1/userTrades',
      '/dapi/v1/income',
      '/dapi/v1/commissionRate',
      // Delivery API - Leverage & Margin
      '/dapi/v1/leverage',
      '/dapi/v1/marginType',
      '/dapi/v1/leverageBracket'
    ];

    return signedEndpoints.some(signedEndpoint => endpoint.includes(signedEndpoint));
  }
}

module.exports = new BinanceClient();
