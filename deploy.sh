#!/bin/bash

# 🛡️ Sapphire Moderation Bot - Production Deployment
echo "🛡️ Sapphire Moderation Bot v2.0"
echo "================================"
echo "Enterprise Discord moderation with 42 commands"
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js $(node --version) detected"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Environment setup
if [ ! -f .env ]; then
    echo "⚙️ Setting up environment configuration..."
    if [ -f .env.example ]; then
        cp .env.example .env
    else
        echo "Creating .env template..."
        cat > .env << 'EOF'
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here

# Database Configuration
MYSQL_URL=mysql://username:password@host:port/database?ssl-mode=REQUIRED

# Optional: Discord Webhooks
PI_STATS_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL

# Optional: Channel IDs for logging
MOD_LOG_CHANNEL_ID=
APPEALS_CHANNEL_ID=
EOF
    fi
    echo ""
    echo "🔧 Configuration required:"
    echo "   nano .env"
    echo ""
    echo "📋 Required settings:"
    echo "   • DISCORD_TOKEN - Bot token from Discord Developer Portal"
    echo "   • MYSQL_URL - Cloud MySQL connection string"
    echo "   • PI_STATS_WEBHOOK - Discord webhook for system stats"
    echo ""
    exit 1
fi

# DNS optimization for Raspberry Pi
echo "🌐 Optimizing DNS for cloud services..."
if ! nslookup google.com > /dev/null 2>&1; then
    echo "🔧 Applying DNS fixes..."
    echo -e "nameserver 8.8.8.8\nnameserver 1.1.1.1" | sudo tee /etc/resolv.conf > /dev/null
fi

echo ""
echo "🚀 Deployment Ready!"
echo "===================="
echo "Start bot: npm start"
echo "Background: nohup npm start &"
echo "Monitor: tail -f nohup.out"
echo ""
echo "📊 Features: 42 commands, backup system, enterprise security"
