#!/bin/bash

# 🛡️ Sapphire Moderation Bot - Raspberry Pi Deployment
echo "🛡️ Sapphire Moderation Bot v2.0 - Raspberry Pi Edition"
echo "======================================================"
echo "Enterprise Discord moderation with 42 slash commands"
echo ""

# System updates for Raspberry Pi
echo "🔄 Updating system packages..."
sudo apt-get update -qq

# Check Node.js version and install if needed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 18 LTS for Raspberry Pi..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo "✅ Node.js $(node --version) installed"
elif [[ $(node --version) < "v16" ]]; then
    echo "⬆️ Upgrading Node.js to v18 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "✅ Node.js $(node --version) detected"
fi

# Install git if missing
if ! command -v git &> /dev/null; then
    echo "📦 Installing Git..."
    sudo apt-get install -y git
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

# DNS optimization for Raspberry Pi cloud connectivity
echo "🌐 Optimizing DNS for cloud database access..."
if ! nslookup google.com > /dev/null 2>&1; then
    echo "🔧 Applying DNS fixes for Pi..."
    sudo cp /etc/resolv.conf /etc/resolv.conf.backup
    echo -e "# Pi DNS optimization\nnameserver 8.8.8.8\nnameserver 1.1.1.1\nnameserver 208.67.222.222" | sudo tee /etc/resolv.conf > /dev/null
    echo "✅ DNS configured with Google & OpenDNS servers"
fi

# Memory optimization for Raspberry Pi
echo "🔧 Optimizing for Raspberry Pi performance..."
if [ -f /proc/meminfo ]; then
    TOTAL_MEM=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    if [ $TOTAL_MEM -lt 2000000 ]; then
        echo "⚠️ Low memory Pi detected - optimizing Node.js settings"
        export NODE_OPTIONS="--max-old-space-size=512"
        echo 'export NODE_OPTIONS="--max-old-space-size=512"' >> ~/.bashrc
    fi
fi

# Register Discord slash commands
echo "🔧 Registering Discord slash commands..."
if [ -f "register-commands.js" ] && [ -f ".env" ]; then
    if grep -q "your_discord_bot_token_here" .env; then
        echo "⚠️ Please configure .env before registering commands"
    else
        echo "📋 Registering all 42 slash commands with Discord..."
        node register-commands.js
        if [ $? -eq 0 ]; then
            echo "✅ Commands registered successfully!"
        else
            echo "❌ Command registration failed - check your Discord token"
        fi
    fi
else
    echo "⚠️ Skipping command registration - missing files"
fi

echo ""
echo "🚀 Raspberry Pi Deployment Complete!"
echo "===================================="
echo "Next steps:"
echo "1. Configure .env: nano .env"
echo "2. Register commands: node register-commands.js"
echo "3. Start bot: npm start"
echo "4. Background mode: nohup npm start > bot.log 2>&1 &"
echo "5. Monitor logs: tail -f bot.log"
echo ""
echo "📊 Bot includes: 42 slash commands, MySQL backup, Pi system monitoring"
echo "🔗 Memory optimized for Raspberry Pi (512MB+ recommended)"
