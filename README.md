# Binance Proxy for Freqtrade

一个专为 Freqtrade 设计的 Binance API 代理服务器，部署在 VPS 上，让本地 Mac Mini 能够通过代理访问 Binance API。

## 功能特性

- ✅ 完整的 Binance REST API 代理
- ✅ 自动处理 API 签名认证
- ✅ 支持所有 HTTP 方法（GET, POST, PUT, DELETE）
- ✅ 请求日志记录和错误处理
- ✅ 健康检查端点
- ✅ 易于部署和配置

## 架构设计

```
┌─────────────────┐
│  Freqtrade      │
│  (Mac Mini)     │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│  Proxy Server   │
│  (VPS)          │
└────────┬────────┘
         │ HTTPS
         ↓
┌─────────────────┐
│  Binance API    │
└─────────────────┘
```

## 项目结构

```
my-binance-proxy/
├── src/
│   ├── config/
│   │   └── index.js           # 配置管理
│   ├── middleware/
│   │   └── errorHandler.js    # 错误处理中间件
│   ├── routes/
│   │   └── proxy.js           # 代理路由
│   ├── services/
│   │   └── binanceClient.js   # Binance API 客户端
│   ├── utils/
│   │   └── logger.js          # 日志工具
│   └── server.js              # 主服务器文件
├── .env.example               # 环境变量模板
├── .gitignore
├── package.json
├── DEPLOYMENT.md              # 详细部署文档
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
BINANCE_API_URL=https://api.binance.com
BINANCE_API_KEY=your_api_key_here
BINANCE_SECRET_KEY=your_secret_key_here
LOG_LEVEL=info
ENABLE_REQUEST_LOG=true
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

### 代理 Binance API

所有 Binance API 请求都通过 `/api` 前缀：

```bash
# 获取服务器时间
GET http://your-vps-ip:8080/api/v3/time

# 获取交易对信息
GET http://your-vps-ip:8080/api/v3/ticker/24hr?symbol=BTCUSDT

# 获取账户信息（需要签名）
GET http://your-vps-ip:8080/api/v3/account
```

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

## 技术栈

- **Node.js**: 运行时环境
- **Express**: Web 框架
- **Axios**: HTTP 客户端
- **dotenv**: 环境变量管理
- **Morgan**: HTTP 请求日志
- **Crypto**: API 签名生成

## License

MIT

## 支持

如有问题或建议，请提交 Issue。
