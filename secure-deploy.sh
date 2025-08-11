#!/bin/bash

# Secure Pi deployment script - no hardcoded tokens
echo "🔐 Secure Sapphire ModBot Deployment"
echo "===================================="

# Fix directory issues
cd /home/admin 2>/dev/null || cd ~ 2>/dev/null || cd /

# Clean old installations
echo "🧹 Cleaning old files..."
rm -rf moderation-bot232

# Clone repository
echo "📥 Downloading bot..."
git clone https://github.com/Previda/moderation-bot232.git
cd moderation-bot232

# Install dependencies
echo "📦 Installing packages..."
npm install

# The .env file should already be in your GitHub repo
# No token hardcoding - secure deployment!

echo "✅ Deployment complete!"
echo ""
echo "🚀 To start your bot:"
echo "   cd /home/admin/moderation-bot232"
echo "   node bot-final.js"
echo ""
echo "🔄 For production:"
echo "   pm2 start bot-final.js --name modbot"
