#!/bin/bash

# 🚀 Simple Sapphire ModBot Deployment Script
# Skips mongoose detection - just installs and runs

set -e

echo "🚀 Simple Sapphire ModBot Deployment"
echo "===================================="

# Clean up
cd /home/admin 2>/dev/null || cd ~
rm -rf moderation-bot232

# Clone
echo "📥 Cloning repository..."
git clone https://github.com/Previda/moderation-bot232.git
cd moderation-bot232

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env template..."
    cat > .env << 'EOF'
DISCORD_TOKEN=YOUR_DISCORD_TOKEN_HERE
MYSQL_HOST=your_mysql_host
MYSQL_USER=your_mysql_user
MYSQL_PASS=your_mysql_password
MYSQL_DB=your_mysql_database
PI_STATS_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE
MOD_LOG_CHANNEL_ID=
APPEALS_CHANNEL_ID=
EOF
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your credentials: nano .env"
echo "2. Start the bot: node index.js"
echo ""
echo "Your bot should work with the clean MySQL files!"
