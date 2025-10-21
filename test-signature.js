#!/usr/bin/env node
/**
 * Test Binance signature generation
 * Usage: node test-signature.js
 */

const crypto = require('crypto');

// Load environment variables
require('dotenv').config();

const API_KEY = process.env.BINANCE_API_KEY;
const SECRET_KEY = process.env.BINANCE_SECRET_KEY;

if (!API_KEY || !SECRET_KEY) {
  console.error('❌ Missing API credentials in .env file');
  console.error('Please set BINANCE_API_KEY and BINANCE_SECRET_KEY');
  process.exit(1);
}

console.log('✅ API Key found:', API_KEY.substring(0, 8) + '...');
console.log('✅ Secret Key found:', SECRET_KEY.substring(0, 8) + '...');
console.log('');

// Test signature generation
function generateSignature(queryString) {
  return crypto
    .createHmac('sha256', SECRET_KEY)
    .update(queryString)
    .digest('hex');
}

function buildQueryString(params) {
  return Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
}

// Test case 1: Simple GET request
console.log('=== Test Case 1: GET /fapi/v1/account ===');
const timestamp1 = Date.now();
const params1 = { timestamp: timestamp1 };
const queryString1 = buildQueryString(params1);
const signature1 = generateSignature(queryString1);

console.log('Timestamp:', timestamp1);
console.log('Query string:', queryString1);
console.log('Signature:', signature1);
console.log('');

// Test case 2: POST request with parameters
console.log('=== Test Case 2: POST /fapi/v1/marginType ===');
const timestamp2 = Date.now();
const params2 = {
  symbol: 'BTCUSDT',
  marginType: 'ISOLATED',
  timestamp: timestamp2
};
const queryString2 = buildQueryString(params2);
const signature2 = generateSignature(queryString2);

console.log('Parameters:', params2);
console.log('Query string:', queryString2);
console.log('Signature:', signature2);
console.log('');

// Test case 3: Test with Binance API (optional)
const axios = require('axios');

async function testRealAPI() {
  console.log('=== Test Case 3: Real API Call ===');

  try {
    const timestamp = Date.now();
    const params = { timestamp };
    const queryString = buildQueryString(params);
    const signature = generateSignature(queryString);

    const url = `https://fapi.binance.com/fapi/v1/account?${queryString}&signature=${signature}`;

    console.log('Testing URL:', url);
    console.log('Sending request...');

    const response = await axios.get(url, {
      headers: {
        'X-MBX-APIKEY': API_KEY
      }
    });

    console.log('✅ API call successful!');
    console.log('Account data:', JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
  } catch (error) {
    console.error('❌ API call failed:', error.response?.data || error.message);
  }
}

// Run real API test
testRealAPI();
