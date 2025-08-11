#!/bin/bash

# Simple deployment script for private repo
echo "🤖 Deploying Sapphire ModBot to Raspberry Pi"
echo "============================================="

# Fix directory issues
cd /home/admin || cd ~

# Clean old installation
echo "🧹 Cleaning old files..."
rm -rf moderation-bot232

# Clone private repo
echo "📥 Downloading bot..."
git clone https://github.com/Previda/moderation-bot232.git
cd moderation-bot232

# Install dependencies
echo "📦 Installing packages..."
npm install

# Make executable
chmod +x *.sh

echo "✅ Deployment complete!"
echo ""
echo "🚀 To start your bot:"
echo "   node bot-final.js"
echo ""
echo "🔄 For auto-restart:"
echo "   pm2 start bot-final.js --name modbot"
echo "   pm2 startup"
echo "   pm2 save"
