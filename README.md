# Binance Proxy for Freqtrade

一个专为 Freqtrade 设计的 Binance API 代理服务器，部署在 VPS 上，让本地 Mac Mini 能够通过代理访问 Binance API。

## 功能特性

- ✅ 完整的 Binance REST API 透明代理
- ✅ 支持所有 HTTP 方法（GET, POST, PUT, DELETE）
- ✅ 透明转发请求（客户端负责签名）
- ✅ **智能缓存系统**，减少 API 调用，提升响应速度
- ✅ 请求日志记录和错误处理
- ✅ 健康检查和缓存统计端点
- ✅ 易于部署和配置

## 工作模式

**透明代理模式**：
- Proxy 不会修改或重新签名请求
- 客户端（Freqtrade）负责生成 timestamp 和 signature
- Proxy 仅转发请求到对应的 Binance API 端点
- API Key 和 Secret 配置在客户端，**不需要在 VPS 配置**

**智能缓存系统**：
- 自动缓存公开市场数据（如价格、K线、订单簿等）
- 不缓存私有数据（账户、订单、持仓等）
- 根据数据类型自动调整缓存时长（2秒 - 1小时）
- 缓存命中率统计，实时监控性能

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    Freqtrade (Mac Mini)                 │
│  ┌────────────┐                                         │
│  │   Bot 1    │   API Key + Secret → 客户端签名          │
│  └────────────┘                                         │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (已签名请求)
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Binance Proxy Server (VPS)                 │
│  ┌──────────────────────────────────────────────┐       │
│  │  1. 检查缓存 → 命中则直接返回                  │       │
│  │  2. 未命中 → 透明转发到 Binance                │       │
│  │  3. 缓存公开数据（市场行情、K线等）             │       │
│  │  4. 不缓存私有数据（账户、订单等）              │       │
│  └──────────────────────────────────────────────┘       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS (转发原始请求)
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   Binance API                           │
│  - 验证签名（由客户端生成）                               │
│  - 返回数据                                              │
└─────────────────────────────────────────────────────────┘
```

**关键特性**：
- 🔐 **透明代理**：不修改请求，客户端负责签名
- ⚡ **智能缓存**：自动缓存公开市场数据
- 🚫 **安全隔离**：API 密钥只存储在客户端

## 项目结构

```
my-binance-proxy/
├── src/
│   ├── config/
│   │   └── index.js             # 配置管理
│   ├── middleware/
│   │   └── errorHandler.js      # 错误处理中间件
│   ├── routes/
│   │   └── proxy.js             # 代理路由（含缓存逻辑）
│   ├── services/
│   │   ├── binanceClient.js     # Binance API 客户端（透明转发）
│   │   └── cacheService.js      # 智能缓存服务 ⭐ NEW
│   ├── utils/
│   │   └── logger.js            # 日志工具
│   └── server.js                # 主服务器文件
├── .env.example                 # 环境变量模板
├── .gitignore
├── package.json
├── DEPLOYMENT.md                # 详细部署文档
├── CACHE.md                     # 缓存系统文档 ⭐ NEW
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=8080
HOST=0.0.0.0
BINANCE_SPOT_API_URL=https://api.binance.com
BINANCE_FUTURES_API_URL=https://fapi.binance.com
BINANCE_DELIVERY_API_URL=https://dapi.binance.com
# API Key/Secret 不需要配置（客户端负责签名）
BINANCE_API_KEY=
BINANCE_SECRET_KEY=
LOG_LEVEL=info
ENABLE_REQUEST_LOG=false
```

### 3. 启动服务

**开发模式**：
```bash
npm run dev
```

**生产模式**：
```bash
npm start
```

### 4. 测试连接

```bash
curl http://localhost:8080/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2024-XX-XXTXX:XX:XX.XXXZ",
  "service": "binance-proxy"
}
```

## API 使用

### 健康检查

```bash
GET /health
```

返回示例：
```json
{
  "status": "ok",
  "timestamp": "2024-10-21T01:30:00.000Z",
  "service": "binance-proxy",
  "cache": {
    "hits": 1523,
    "misses": 487,
    "total": 2010,
    "hitRate": "75.77%",
    "keys": 42
  }
}
```

### 缓存统计

```bash
# 查看缓存统计
GET /cache/stats

# 清空缓存（仅用于调试）
POST /cache/clear
```

### 代理 Binance API

所有 Binance API 请求都通过对应前缀：

```bash
# 现货 API - 获取服务器时间（缓存 5 秒）
GET http://your-vps-ip:8080/api/v3/time

# 现货 API - 获取 24hr 行情（缓存 10 秒）
GET http://your-vps-ip:8080/api/v3/ticker/24hr?symbol=BTCUSDT

# 合约 API - 获取 K线数据（缓存 5-10 分钟，根据时间周期）
GET http://your-vps-ip:8080/fapi/v1/klines?symbol=BTCUSDT&interval=5m

# 获取账户信息（不缓存，需要签名）
GET http://your-vps-ip:8080/api/v3/account
```

### 缓存规则

| 端点类型 | 缓存时长 | 示例 |
|---------|---------|------|
| 交易对信息 | 1 小时 | `/exchangeInfo` |
| 24hr 行情 | 10 秒 | `/ticker/24hr` |
| 价格 Ticker | 5 秒 | `/ticker/price` |
| 订单簿深度 | 2 秒 | `/depth` |
| K线数据 | 5秒-10分钟 | `/klines`（根据 interval） |
| 服务器时间 | 5 秒 | `/time` |
| 账户/订单 | **不缓存** | `/account`, `/order` |

## Freqtrade 配置

在 Freqtrade 的 `config.json` 中添加：

```json
{
  "exchange": {
    "name": "binance",
    "key": "你的_Binance_API_Key",
    "secret": "你的_Binance_Secret_Key",
    "ccxt_config": {
      "enableRateLimit": false,
      "urls": {
        "api": {
          "public": "http://43.133.168.55:8080/api/v3",
          "private": "http://43.133.168.55:8080/api/v3"
        }
      }
    },
    "ccxt_async_config": {
      "enableRateLimit": false,
      "urls": {
        "api": {
          "public": "http://43.133.168.55:8080/api/v3",
          "private": "http://43.133.168.55:8080/api/v3"
        }
      }
    }
  }
}
```

**重要说明**：
- 将 `43.133.168.55` 替换为你的实际 VPS IP 地址
- `enableRateLimit` 设置为 `false`，因为代理已经处理了速率限制
- API Key 和 Secret 配置在 Freqtrade 端，不要配置在 VPS 的 .env 文件中
- 路径必须包含 `/api/v3`，这样请求会转发到 `https://api.binance.com/api/v3/...`

## 部署到 VPS

详细的部署说明请参考 [DEPLOYMENT.md](DEPLOYMENT.md)

简要步骤：

1. 安装 Node.js 18+
2. 上传代码到 VPS
3. 安装依赖：`npm install`
4. 配置 `.env` 文件
5. 使用 PM2 守护进程：`pm2 start src/server.js --name binance-proxy`
6. 配置防火墙允许端口访问
7. 在 Mac Mini 的 Freqtrade 中配置代理地址

## 安全建议

1. **使用 HTTPS**：配置 Nginx + Let's Encrypt SSL 证书
2. **IP 白名单**：限制只允许你的 Mac Mini IP 访问
3. **保护密钥**：不要将 `.env` 提交到 Git
4. **定期更新**：保持依赖包更新

## 监控和日志

使用 PM2 管理：

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs binance-proxy

# 实时监控
pm2 monit

# 重启服务
pm2 restart binance-proxy
```

## 故障排查

### 常见问题

1. **连接超时**：检查 VPS 防火墙和安全组设置
2. **401 错误**：验证 Binance API Key 和 Secret
3. **签名错误**：确保系统时间同步

查看详细日志：
```bash
pm2 logs binance-proxy --lines 100
```

## 性能优化

### 缓存效果预估

根据典型 Freqtrade 使用场景：

| 场景 | 无缓存 | 有缓存 | 改善 |
|------|--------|--------|------|
| K线数据请求 | 100-300ms | 1-5ms | **95%+** |
| 价格 Ticker | 80-200ms | 1-3ms | **98%+** |
| API 请求次数 | 1000次/分钟 | 200-400次/分钟 | **60-80%↓** |
| 缓存命中率 | - | 60-85% | - |

### 日志示例

启用缓存后的日志输出：

```
[INFO] GET /fapi/v1/ticker/24hr
[INFO] GET /fapi/v1/ticker/24hr [CACHED]  ← 从缓存返回
[INFO] GET /fapi/v1/klines?symbol=BTCUSDT&interval=5m
[INFO] GET /fapi/v1/klines?symbol=BTCUSDT&interval=5m [CACHED]
[INFO] Cache stats { hits: 342, misses: 89, hitRate: '79.35%', cachedKeys: 23 }
```

## 故障排查

### 常见问题

1. **连接超时**
   - 检查 VPS 防火墙和安全组设置
   - 确认端口 8080 已开放

2. **签名错误 (-1022)**
   - ✅ 确保 Freqtrade 配置了正确的 API Key 和 Secret
   - ✅ 检查系统时间是否同步（`ntpdate` 或 `timedatectl`）
   - ✅ VPS 的 `.env` 文件中 `BINANCE_API_KEY` 和 `BINANCE_SECRET_KEY` 应为**空**

3. **缓存问题**
   - 查看缓存统计：`curl http://your-vps-ip:8080/cache/stats`
   - 清空缓存重试：`curl -X POST http://your-vps-ip:8080/cache/clear`
   - 检查日志中是否有 `[CACHED]` 标记

4. **401 未授权错误**
   - 验证 Freqtrade 端的 Binance API Key 和 Secret
   - 确认 API Key 有正确的权限（现货交易 / 合约交易）

查看详细日志：
```bash
pm2 logs binance-proxy --lines 100
```

## 技术栈

- **Node.js** 18+: 运行时环境
- **Express** 4.x: Web 框架
- **Axios** 1.x: HTTP 客户端
- **node-cache** 5.x: 内存缓存 ⭐ NEW
- **dotenv**: 环境变量管理
- **Morgan**: HTTP 请求日志

## 更新日志

### v2.0.0 (2024-10-21)
- ✨ 新增智能缓存系统（node-cache）
- ✨ 切换到透明代理模式（客户端负责签名）
- ✨ 新增缓存统计端点 `/cache/stats`
- 🔧 简化日志输出
- 📝 完善文档

### v1.0.0 (2024-10-20)
- 🎉 初始版本
- ✅ 基础代理功能
- ✅ 支持现货、合约、交割 API

## License

MIT

## 支持

如有问题或建议，请提交 Issue。
