#!/bin/bash

# 🚀 Ultimate Sapphire ModBot Deployment Script
# One-command deployment with automatic cleanup and error handling

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Animation function
animate() {
    local text="$1"
    echo -n -e "${BLUE}$text${NC}"
    for i in {1..3}; do
        echo -n "."
        sleep 0.5
    done
    echo ""
}

# Header
clear
echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                 🚀 SAPPHIRE MODBOT DEPLOYER 🚀               ║"
echo "║              Ultimate Clean Deployment System                ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Environment Check
echo -e "${CYAN}🔍 STEP 1: Environment Check${NC}"
animate "Checking system requirements"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found! Please install Node.js first.${NC}"
    exit 1
fi

# Check Git
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git not found! Please install Git first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node --version) found${NC}"
echo -e "${GREEN}✅ Git $(git --version | cut -d' ' -f3) found${NC}"

# Step 2: Cleanup
echo -e "${CYAN}🧹 STEP 2: Complete Cleanup${NC}"
animate "Removing old installations"

cd /home/admin 2>/dev/null || cd ~
rm -rf moderation-bot232* 2>/dev/null || true
rm -rf sapphire-modbot* 2>/dev/null || true

echo -e "${GREEN}✅ Cleanup complete${NC}"

# Step 3: Fresh Clone
echo -e "${CYAN}📥 STEP 3: Fresh Repository Clone${NC}"
animate "Cloning from GitHub"

if ! git clone https://github.com/Previda/moderation-bot232.git; then
    echo -e "${RED}❌ Failed to clone repository!${NC}"
    echo -e "${YELLOW}💡 Check your internet connection and repository access${NC}"
    exit 1
fi

cd moderation-bot232
echo -e "${GREEN}✅ Repository cloned successfully${NC}"

# Step 4: Aggressive MongoDB Cleanup
echo -e "${CYAN}🗑️ STEP 4: MongoDB Cleanup (Aggressive)${NC}"
animate "Removing all MongoDB/Mongoose files"

# Remove entire schemas directory
rm -rf src/schemas/ 2>/dev/null || true

# Remove specific problematic files
PROBLEM_FILES=(
    "src/utils/threatScore.js"
    "src/commands/admin/threatscore.js"
    "src/utils/automod.js"
    "src/middleware/automod.js"
    "src/models/mongoose.js"
    "src/models/schemas.js"
)

for file in "${PROBLEM_FILES[@]}"; do
    rm -f "$file" 2>/dev/null || true
done

# Find and remove ANY file with mongoose imports
echo -e "${YELLOW}🔍 Scanning for mongoose references...${NC}"
MONGOOSE_FILES=$(find . -name "*.js" -type f -exec grep -l "mongoose\|Schema\|model(" {} \; 2>/dev/null | grep -v node_modules || true)

if [ ! -z "$MONGOOSE_FILES" ]; then
    echo -e "${YELLOW}⚠️  Found files with MongoDB references:${NC}"
    echo "$MONGOOSE_FILES"
    echo "$MONGOOSE_FILES" | xargs rm -f
    echo -e "${GREEN}✅ Removed problematic files${NC}"
else
    echo -e "${GREEN}✅ No MongoDB references found${NC}"
fi

# Step 5: Dependencies
echo -e "${CYAN}📦 STEP 5: Installing Dependencies${NC}"
animate "Installing Node.js packages"

if ! npm install --production --silent; then
    echo -e "${RED}❌ Failed to install dependencies!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed successfully${NC}"

# Step 6: Environment Setup
echo -e "${CYAN}📝 STEP 6: Environment Configuration${NC}"

if [ ! -f .env ]; then
    echo -e "${YELLOW}📋 Creating .env template...${NC}"
    cat > .env << 'EOF'
# 🤖 Sapphire ModBot Configuration
# Fill in your actual values below:

DISCORD_TOKEN=YOUR_DISCORD_TOKEN_HERE
MYSQL_HOST=your_mysql_host
MYSQL_USER=your_mysql_user
MYSQL_PASS=your_mysql_password
MYSQL_DB=your_mysql_database
PI_STATS_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE
MOD_LOG_CHANNEL_ID=
APPEALS_CHANNEL_ID=
EOF
    echo -e "${GREEN}✅ .env template created${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Step 7: Final Validation
echo -e "${CYAN}🔍 STEP 7: Final Validation${NC}"
animate "Running system checks"

# Check critical files
CRITICAL_FILES=("index.js" "package.json" "src/commands" "src/models")
for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -e "$file" ]; then
        echo -e "${RED}❌ Critical file/directory missing: $file${NC}"
        exit 1
    fi
done

# Verify no mongoose references remain
REMAINING_MONGOOSE=$(find . -name "*.js" -type f -exec grep -l "mongoose" {} \; 2>/dev/null | grep -v node_modules || true)
if [ ! -z "$REMAINING_MONGOOSE" ]; then
    echo -e "${RED}❌ Still found mongoose references:${NC}"
    echo "$REMAINING_MONGOOSE"
    exit 1
fi

echo -e "${GREEN}✅ All validation checks passed${NC}"

# Success Message
echo ""
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    🎉 DEPLOYMENT SUCCESS! 🎉                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}📋 NEXT STEPS:${NC}"
echo ""
echo -e "${CYAN}1. Configure your bot:${NC}"
echo "   nano .env"
echo ""
echo -e "${CYAN}2. Start your bot:${NC}"
echo "   node index.js"
echo ""
echo -e "${BLUE}💡 BOT FEATURES:${NC}"
echo "• 🔨 Advanced Moderation (/ban, /kick, /warn, /mute)"
echo "• 🎫 Interactive Tickets (/ticket, !ticket menu)"
echo "• 📝 Appeals System (/appeal, DM commands)"
echo "• 💰 Economy System (/balance, /daily, /work)"
echo "• 🖥️ System Monitoring (/sysinfo, /tempsys)"
echo "• 📋 Help System (/commands)"
echo "• 🛡️ Error Handling (invalid command protection)"
echo ""
echo -e "${GREEN}🚀 Ready to launch! Your bot is clean and optimized!${NC}"
