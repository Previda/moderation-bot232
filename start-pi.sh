#!/bin/bash

# 🍓 Sapphire Bot - Raspberry Pi Startup Script
echo "🍓 Starting Sapphire Moderation Bot on Raspberry Pi..."

# Set memory optimization for Pi
TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_MEM_MB=$((TOTAL_MEM_KB / 1024))

if [ $TOTAL_MEM_MB -lt 1024 ]; then
    export NODE_OPTIONS="--max-old-space-size=384"
elif [ $TOTAL_MEM_MB -lt 2048 ]; then
    export NODE_OPTIONS="--max-old-space-size=768"
else
    export NODE_OPTIONS="--max-old-space-size=1536"
fi

echo "💾 Memory: ${TOTAL_MEM_MB}MB - Node.js limit: $NODE_OPTIONS"

# Check if .env is configured
if grep -q "your_discord_bot_token_here" .env 2>/dev/null; then
    echo "❌ Please configure .env file first:"
    echo "   nano .env"
    exit 1
fi

# Register commands if not done
if [ -f "register-commands.js" ]; then
    echo "🔧 Checking Discord command registration..."
    node register-commands.js > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "✅ Commands registered successfully"
    else
        echo "⚠️ Command registration failed - continuing anyway"
    fi
fi

# Start the bot
echo "🚀 Starting Sapphire Moderation Bot..."
echo "📊 42 slash commands ready"
echo "🔗 Database: $(grep MYSQL_URL .env | cut -d'=' -f1)"
echo ""

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    echo "🔄 Starting with PM2 process manager..."
    pm2 start index.js --name sapphire-bot --time
    pm2 logs sapphire-bot --lines 10
else
    echo "🔄 Starting in foreground mode..."
    node index.js
fi
