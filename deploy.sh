#!/bin/bash

# Binance Proxy Deployment Script
# Usage: ./deploy.sh

set -e

echo "🚀 Deploying Binance Proxy updates..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in a git repo
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Not a git repository. Skipping git operations.${NC}"
else
    echo "📦 Committing changes..."
    git add .
    git commit -m "fix: switch to transparent proxy mode - client handles signing" || echo "No changes to commit"

    echo "⬆️  Pushing to remote..."
    git push
fi

echo ""
echo -e "${GREEN}✅ Code committed and pushed!${NC}"
echo ""
echo "Now on your VPS, run:"
echo -e "${YELLOW}"
echo "  cd /root/my-binance-proxy"
echo "  git pull"
echo "  pm2 restart binance-proxy"
echo -e "${NC}"
