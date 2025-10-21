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

  // Signature generation removed - client handles signing
  // This proxy is now in transparent mode

  /**
   * Prepare request - transparent proxy mode
   * Client (Freqtrade) handles signature, proxy just forwards
   */
  _prepareRequest(method, endpoint, params = {}) {
    const config = {
      method,
      url: endpoint
    };

    // Transparently forward all parameters
    // Client is responsible for adding timestamp and signature
    if (method === 'GET' || method === 'DELETE') {
      config.params = params;
    } else if (method === 'POST' || method === 'PUT') {
      // For POST/PUT, try params first (signed requests use query params)
      // Fall back to body for non-signed requests
      if (Object.keys(params).length > 0) {
        // If params contain signature, use query params
        if (params.signature) {
          config.params = params;
        } else {
          config.data = params;
        }
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

      // Prepare request (transparent proxy - no signature modification)
      const requestConfig = this._prepareRequest(method, endpoint, params);

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

  // _requiresSignature method removed - transparent proxy mode
  // Client (Freqtrade) is responsible for all signature generation
}

module.exports = new BinanceClient();
