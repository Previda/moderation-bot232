#!/bin/bash

echo "🚀 Sapphire ModBot Quick Setup"
echo "=============================="

# Clean and clone
echo "📥 Downloading bot..."
cd /home/admin
rm -rf moderation-bot232
git clone https://github.com/Previda/moderation-bot232.git
cd moderation-bot232

# Progress indicator
echo -n "⏳ Setting up"
for i in {1..10}; do
    echo -n "."
    sleep 0.3
done
echo " Done!"

# Install dependencies
echo "📦 Installing packages..."
npm install

# Create .env
echo "⚙️ Creating config file..."
cat > .env << 'EOF'
DISCORD_TOKEN=MTM1ODUyNzIxNTAyMDU0NDIyMg.GT6kXI.9NWxX_PzX3JoyZvAPxcUKzv7MQqwb5zSfFnmIg
MYSQL_HOST=sql306.infinityfree.com
MYSQL_USER=if0_39607707
MYSQL_PASS=QrAuCNHhmn
MYSQL_DB=if0_39607707_XXX
PI_STATS_WEBHOOK=https://discord.com/api/webhooks/1403915943649873940/tfiZBMZstReo-JSk6ayxeooaY7skzX5CqGRztTRgsPbeZ7i42UW-wsxKILYaBc3AP8g5
EOF

echo "✅ Setup complete!"
echo ""
echo "🎯 To start the bot:"
echo "   node bot-final.js"
echo ""
echo "🔧 To run with PM2:"
echo "   pm2 start bot-final.js --name modbot"
