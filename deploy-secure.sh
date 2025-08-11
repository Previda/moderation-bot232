#!/bin/bash

# Secure deployment script - NO HARDCODED TOKENS
echo "🔐 Secure Sapphire ModBot Deployment"
echo "===================================="

# Fix directory issues
cd /home/admin 2>/dev/null || cd ~ 2>/dev/null || cd /

# Clean old installations
echo "🧹 Cleaning old files..."
rm -rf moderation-bot232

# Clone repository
echo "📥 Downloading bot..."
if git clone https://github.com/Previda/moderation-bot232.git; then
    echo "✅ Repository cloned successfully"
else
    echo "❌ Failed to clone repository"
    exit 1
fi

cd moderation-bot232

# Install dependencies
echo "📦 Installing packages..."
npm install

# Check if .env exists
if [ -f ".env" ]; then
    echo "✅ .env file found (from private repo)"
else
    echo "📝 Creating .env template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your credentials!"
    echo "   nano .env"
    echo ""
    echo "Required values:"
    echo "- DISCORD_TOKEN: Your bot token from Discord Developer Portal"
    echo "- MYSQL_HOST: Your MySQL server host"
    echo "- MYSQL_USER: Your MySQL username"
    echo "- MYSQL_PASS: Your MySQL password"
    echo "- MYSQL_DB: Your MySQL database name"
    echo "- PI_STATS_WEBHOOK: Your Discord webhook URL (optional)"
    echo ""
    echo "❌ Bot will NOT start until .env is configured!"
    exit 1
fi

echo "✅ Deployment complete!"
echo ""
echo "🚀 To start your bot:"
echo "   cd /home/admin/moderation-bot232"
echo "   node index.js"
echo ""
echo "🔄 For production:"
echo "   pm2 start index.js --name modbot"
