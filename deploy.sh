#!/bin/bash

# 🛡️ Sapphire Moderation Bot - Production Deployment
# Enterprise-grade deployment script for Raspberry Pi and cloud platforms

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
npm install --production

# Environment setup
if [ ! -f .env ]; then
    echo "⚙️ Setting up environment configuration..."
    cp .env.example .env
    echo ""
    echo "🔧 Configuration required:"
    echo "   nano .env"
    echo ""
    echo "📋 Required settings:"
    echo "   • DISCORD_TOKEN - Bot token from Discord Developer Portal"
    echo "   • MYSQL_URL - Cloud MySQL connection string"
    echo "   • PI_STATS_WEBHOOK - Discord webhook for system stats"
    echo ""
    echo "🌐 Supported MySQL providers:"
    echo "   • Aiven (recommended)"
    echo "   • PlanetScale"
    echo "   • Railway"
    echo "   • Traditional MySQL"
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
