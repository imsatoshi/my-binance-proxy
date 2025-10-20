# Freqtrade Futures 配置指南

## Binance Futures (合约) 代理配置

### 重要说明

Binance Futures 使用不同的 API 端点：
- **现货 Spot**: `https://api.binance.com/api/v3/...`
- **U本位合约 USDT-M Futures**: `https://fapi.binance.com/fapi/v1/...`
- **币本位合约 COIN-M Delivery**: `https://dapi.binance.com/dapi/v1/...`

我们的代理服务器会根据请求路径自动路由到正确的 Binance API。

## Freqtrade配置

### U本位合约 (USDT-M Futures) 配置

在你的 Freqtrade `config.json` 中：

```json
{
  "trading_mode": "futures",
  "margin_mode": "isolated",

  "exchange": {
    "name": "binance",
    "key": "你的_Binance_API_Key",
    "secret": "你的_Binance_Secret_Key",
    "ccxt_config": {
      "enableRateLimit": false,
      "urls": {
        "api": {
          "fapiPublic": "http://43.133.168.55:8080/fapi/v1",
          "fapiPrivate": "http://43.133.168.55:8080/fapi/v1",
          "fapiPublicV2": "http://43.133.168.55:8080/fapi/v2",
          "fapiPrivateV2": "http://43.133.168.55:8080/fapi/v2"
        }
      }
    },
    "ccxt_async_config": {
      "enableRateLimit": false,
      "urls": {
        "api": {
          "fapiPublic": "http://43.133.168.55:8080/fapi/v1",
          "fapiPrivate": "http://43.133.168.55:8080/fapi/v1",
          "fapiPublicV2": "http://43.133.168.55:8080/fapi/v2",
          "fapiPrivateV2": "http://43.133.168.55:8080/fapi/v2"
        }
      }
    }
  },

  "stake_currency": "USDT",
  "dry_run": false,
  "dry_run_wallet": 1000
}
```

### 币本位合约 (COIN-M Delivery) 配置

如果使用币本位合约：

```json
{
  "trading_mode": "futures",
  "margin_mode": "isolated",

  "exchange": {
    "name": "binance",
    "key": "你的_Binance_API_Key",
    "secret": "你的_Binance_Secret_Key",
    "ccxt_config": {
      "enableRateLimit": false,
      "urls": {
        "api": {
          "dapiPublic": "http://43.133.168.55:8080/dapi/v1",
          "dapiPrivate": "http://43.133.168.55:8080/dapi/v1"
        }
      }
    },
    "ccxt_async_config": {
      "enableRateLimit": false,
      "urls": {
        "api": {
          "dapiPublic": "http://43.133.168.55:8080/dapi/v1",
          "dapiPrivate": "http://43.133.168.55:8080/dapi/v1"
        }
      }
    }
  }
}
```

## 测试步骤

### 1. 测试代理端点

在 VPS 上测试 Futures API：

```bash
# 测试 Futures Ping
curl "http://localhost:8080/fapi/v1/ping"

# 测试 Futures 服务器时间
curl "http://localhost:8080/fapi/v1/time"

# 测试 Futures 交易对信息
curl "http://localhost:8080/fapi/v1/exchangeInfo"

# 测试 Futures 价格
curl "http://localhost:8080/fapi/v1/ticker/price?symbol=BTCUSDT"

# 测试 Futures K线数据
curl "http://localhost:8080/fapi/v1/klines?symbol=BTCUSDT&interval=1h&limit=1"
```

### 2. 从 Mac Mini 测试

```bash
# 替换为你的 VPS IP
curl "http://43.133.168.55:8080/fapi/v1/ticker/price?symbol=BTCUSDT"
curl "http://43.133.168.55:8080/fapi/v1/exchangeInfo"
```

### 3. 测试 Freqtrade

```bash
# 在 Mac Mini 上
freqtrade test-pairlist -c config.json

# 或者启动 dry-run 模式
freqtrade trade -c config.json --dry-run
```

## API 权限要求

确保你的 Binance API Key 具有以下权限：
- ✅ **Enable Reading** (读取权限)
- ✅ **Enable Futures** (合约权限)
- ✅ **Enable Spot & Margin Trading** (现货和杠杆交易权限，如果需要)
- ❌ **Enable Withdrawals** (不需要提现权限，更安全)

## 常用 Futures API 端点

### 公开端点（不需要签名）
- `/fapi/v1/ping` - 测试连接
- `/fapi/v1/time` - 服务器时间
- `/fapi/v1/exchangeInfo` - 交易对信息
- `/fapi/v1/ticker/price` - 最新价格
- `/fapi/v1/ticker/24hr` - 24小时价格统计
- `/fapi/v1/klines` - K线数据
- `/fapi/v1/depth` - 深度信息

### 私有端点（需要签名）
- `/fapi/v1/account` - 账户信息
- `/fapi/v1/balance` - 余额信息
- `/fapi/v1/positionRisk` - 持仓风险
- `/fapi/v1/order` - 下单/查询/取消订单
- `/fapi/v1/openOrders` - 当前挂单
- `/fapi/v1/allOrders` - 所有订单
- `/fapi/v2/account` - 账户信息 V2
- `/fapi/v2/balance` - 余额信息 V2
- `/fapi/v2/positionRisk` - 持仓风险 V2

## 故障排查

### 1. 无法获取价格

检查代理日志：
```bash
pm2 logs binance-proxy --lines 50
```

查找是否有 404 或其他错误。

### 2. 签名错误

- 确保 API Key 和 Secret 在 Freqtrade 配置文件中
- 确保 API Key 有 Futures 权限
- 检查系统时间是否同步

### 3. 连接超时

- 检查 VPS 防火墙：`sudo ufw status`
- 测试网络：`curl http://43.133.168.55:8080/health`
- 查看代理状态：`pm2 status`

## 配置文件示例

完整的 Freqtrade Futures 配置示例：

```json
{
  "max_open_trades": 3,
  "stake_currency": "USDT",
  "stake_amount": "unlimited",
  "tradable_balance_ratio": 0.99,
  "fiat_display_currency": "USD",
  "dry_run": false,
  "cancel_open_orders_on_exit": true,

  "trading_mode": "futures",
  "margin_mode": "isolated",

  "exchange": {
    "name": "binance",
    "key": "YOUR_API_KEY",
    "secret": "YOUR_SECRET_KEY",
    "ccxt_config": {
      "enableRateLimit": false,
      "urls": {
        "api": {
          "fapiPublic": "http://43.133.168.55:8080/fapi/v1",
          "fapiPrivate": "http://43.133.168.55:8080/fapi/v1",
          "fapiPublicV2": "http://43.133.168.55:8080/fapi/v2",
          "fapiPrivateV2": "http://43.133.168.55:8080/fapi/v2"
        }
      }
    },
    "ccxt_async_config": {
      "enableRateLimit": false,
      "urls": {
        "api": {
          "fapiPublic": "http://43.133.168.55:8080/fapi/v1",
          "fapiPrivate": "http://43.133.168.55:8080/fapi/v1",
          "fapiPublicV2": "http://43.133.168.55:8080/fapi/v2",
          "fapiPrivateV2": "http://43.133.168.55:8080/fapi/v2"
        }
      }
    },
    "pair_whitelist": [
      "BTC/USDT:USDT",
      "ETH/USDT:USDT"
    ],
    "pair_blacklist": []
  },

  "entry_pricing": {
    "price_side": "same",
    "use_order_book": true,
    "order_book_top": 1,
    "price_last_balance": 0.0,
    "check_depth_of_market": {
      "enabled": false,
      "bids_to_ask_delta": 1
    }
  },

  "exit_pricing": {
    "price_side": "same",
    "use_order_book": true,
    "order_book_top": 1
  }
}
```

## 注意事项

1. **合约交易对格式**：在 Freqtrade 中使用 `BTC/USDT:USDT` 格式表示 U本位合约
2. **杠杆设置**：可以在策略中通过 `leverage()` 方法设置杠杆倍数
3. **保证金模式**：`isolated` (逐仓) 或 `cross` (全仓)
4. **风险管理**：合约交易风险较高，建议先使用 dry-run 模式测试

## 支持

如有问题，请查看：
- 代理日志：`pm2 logs binance-proxy`
- Freqtrade 日志
- [Binance Futures API 文档](https://developers.binance.com/docs/derivatives/usds-margined-futures)
