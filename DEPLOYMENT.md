# Binance Proxy 部署文档

## 一、系统要求

- Node.js 14+
- npm 或 yarn
- VPS 服务器（已配置好网络）
- Binance API Key 和 Secret Key

## 二、在 VPS 上部署

### 1. 安装 Node.js

```bash
# 安装 nvm（如果还没有安装）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 重新加载配置
source ~/.bashrc

# 安装 Node.js
nvm install 18
nvm use 18
```

### 2. 上传代码到 VPS

**方法一：使用 Git**
```bash
# 在 VPS 上
cd ~
git clone <your-repo-url>
cd my-binance-proxy
```

**方法二：使用 scp 从本地上传**
```bash
# 在本地 Mac 上执行
cd /Users/zhangjiawei/Documents/my-binance-proxy
tar -czf binance-proxy.tar.gz .
scp binance-proxy.tar.gz user@your-vps-ip:~/

# 在 VPS 上解压
ssh user@your-vps-ip
mkdir -p ~/my-binance-proxy
tar -xzf binance-proxy.tar.gz -C ~/my-binance-proxy
cd ~/my-binance-proxy
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
nano .env
```

配置内容：
```env
PORT=8080
HOST=0.0.0.0
BINANCE_API_URL=https://api.binance.com
BINANCE_API_KEY=你的_Binance_API_Key
BINANCE_SECRET_KEY=你的_Binance_Secret_Key
LOG_LEVEL=info
ENABLE_REQUEST_LOG=true
```

### 5. 测试运行

```bash
npm start
```

如果看到以下信息说明启动成功：
```
[2024-XX-XX] [INFO] Binance Proxy Server started on 0.0.0.0:8080
[2024-XX-XX] [INFO] Proxying requests to: https://api.binance.com
```

### 6. 使用 PM2 守护进程（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start src/server.js --name binance-proxy

# 查看状态
pm2 status

# 查看日志
pm2 logs binance-proxy

# 设置开机自启
pm2 startup
pm2 save
```

### 7. 配置防火墙

```bash
# 允许端口访问（假设使用 ufw）
sudo ufw allow 8080/tcp
sudo ufw reload
```

### 8. 测试连接

```bash
# 在 VPS 上测试
curl http://localhost:8080/health

# 从本地 Mac 测试
curl http://your-vps-ip:8080/health
```

预期响应：
```json
{
  "status": "ok",
  "timestamp": "2024-XX-XXTXX:XX:XX.XXXZ",
  "service": "binance-proxy"
}
```

## 三、在 Mac Mini 上配置 Freqtrade

### 1. 修改 Freqtrade 配置文件

编辑你的 Freqtrade 配置文件（通常是 `config.json`）：

```json
{
  "exchange": {
    "name": "binance",
    "ccxt_config": {
      "enableRateLimit": true,
      "urls": {
        "api": {
          "public": "http://your-vps-ip:8080/api",
          "private": "http://your-vps-ip:8080/api"
        }
      }
    },
    "ccxt_async_config": {
      "enableRateLimit": true,
      "urls": {
        "api": {
          "public": "http://your-vps-ip:8080/api",
          "private": "http://your-vps-ip:8080/api"
        }
      }
    }
  }
}
```

**注意**：将 `your-vps-ip` 替换为你的 VPS 实际 IP 地址。

### 2. 测试 Freqtrade 连接

```bash
# 测试配置
freqtrade test-pairlist -c config.json

# 运行回测
freqtrade backtesting -c config.json --strategy YourStrategy
```

## 四、安全建议

### 1. 使用 HTTPS（可选但推荐）

安装 Nginx 反向代理：

```bash
# 安装 Nginx
sudo apt update
sudo apt install nginx

# 安装 Certbot (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx
```

配置 Nginx (`/etc/nginx/sites-available/binance-proxy`):
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 2. IP 白名单限制

修改 [src/server.js](src/server.js) 添加 IP 限制：

```javascript
const allowedIPs = ['your-mac-mini-ip'];

app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});
```

### 3. 使用环境变量保护密钥

- **不要**将 `.env` 文件提交到 Git
- 确保文件权限正确：`chmod 600 .env`

## 五、监控和维护

### 查看日志
```bash
# PM2 日志
pm2 logs binance-proxy

# 实时监控
pm2 monit
```

### 重启服务
```bash
pm2 restart binance-proxy
```

### 更新代码
```bash
cd ~/my-binance-proxy
git pull
npm install
pm2 restart binance-proxy
```

## 六、故障排查

### 连接问题
1. 检查 VPS 防火墙设置
2. 确认服务是否运行：`pm2 status`
3. 查看日志：`pm2 logs binance-proxy`
4. 测试网络连通性：`curl http://localhost:8080/health`

### Binance API 错误
1. 检查 API Key 和 Secret 是否正确
2. 确认 Binance API 权限设置
3. 查看详细错误日志

### Freqtrade 连接失败
1. 确认配置文件中的 IP 地址正确
2. 测试代理连接：`curl http://your-vps-ip:8080/api/v3/ping`
3. 检查 Freqtrade 日志

## 七、性能优化

### 增加超时时间
编辑 [src/services/binanceClient.js](src/services/binanceClient.js:14)，调整 `timeout` 值。

### 启用 Redis 缓存（高级）
可以添加 Redis 缓存层来减少对 Binance API 的重复请求。

## 支持

如有问题，请查看日志文件或提交 Issue。
