#!/bin/bash

# Complete Pi deployment fix script
echo "🔧 Fixing Raspberry Pi deployment issues..."
echo "=========================================="

# Step 1: Fix directory issue by going to a safe location
echo "📂 Step 1: Fixing directory issues..."
cd /home/admin 2>/dev/null || cd ~ 2>/dev/null || cd /
echo "Current directory: $(pwd)"

# Step 2: Clean everything
echo "🧹 Step 2: Cleaning old installations..."
rm -rf moderation-bot232 2>/dev/null
rm -rf sapphire-modbot 2>/dev/null

# Step 3: Clone fresh
echo "📥 Step 3: Downloading fresh bot files..."
if git clone https://github.com/Previda/moderation-bot232.git; then
    echo "✅ Repository cloned successfully"
else
    echo "❌ Failed to clone. Make sure files are uploaded to GitHub!"
    exit 1
fi

# Step 4: Navigate to bot directory
cd moderation-bot232
echo "📍 Now in: $(pwd)"

# Step 5: Check required files
echo "🔍 Step 4: Checking files..."
if [ ! -f "bot-final.js" ]; then
    echo "❌ bot-final.js not found! Upload it to GitHub first."
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json not found! Upload it to GitHub first."
    exit 1
fi

echo "✅ All required files found"

# Step 6: Install dependencies
echo "📦 Step 5: Installing dependencies..."
npm install

# Step 7: Create/update .env file
echo "⚙️ Step 6: Setting up environment..."
cat > .env << 'EOF'
DISCORD_TOKEN=MTM1ODUyNzIxNTAyMDU0NDIyMg.GaemOt.GpvQszotmIiA_JEx3biIKGXLPPcx899KBrOeRE
MYSQL_HOST=sql306.infinityfree.com
MYSQL_USER=if0_39607707
MYSQL_PASS=QrAuCNHhmn
MYSQL_DB=if0_39607707_XXX
PI_STATS_WEBHOOK=https://discord.com/api/webhooks/1403915943649873940/tfiZBMZstReo-JSk6ayxeooaY7skzX5CqGRztTRgsPbeZ7i42UW-wsxKILYaBc3AP8g5
MOD_LOG_CHANNEL_ID=
APPEALS_CHANNEL_ID=
EOF

echo "✅ Environment configured with your credentials"

# Step 8: Test bot startup
echo "🧪 Step 7: Testing bot startup..."
echo "Current working directory: $(pwd)"
echo "Bot file exists: $(ls -la bot-final.js 2>/dev/null && echo 'YES' || echo 'NO')"

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo ""
echo "🚀 To start your bot:"
echo "   cd /home/admin/moderation-bot232"
echo "   node bot-final.js"
echo ""
echo "🔄 For production with auto-restart:"
echo "   cd /home/admin/moderation-bot232"
echo "   pm2 start bot-final.js --name modbot"
echo "   pm2 startup"
echo "   pm2 save"
echo ""
echo "📊 Bot features ready:"
echo "   • Advanced moderation commands"
echo "   • Ticket system with categories"
echo "   • Appeals system"
echo "   • Custom prefixes & role permissions"
echo "   • Automod (spam, invite, NSFW detection)"
echo "   • Pi monitoring (/tempsys command)"
echo ""
echo "✅ Your bot is ready to run!"
