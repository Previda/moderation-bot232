#!/bin/bash

# 🚀 FIXED Sapphire ModBot Deployment Script
# This version properly handles clean MySQL schema files

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
echo "║              FIXED - MySQL Schema Friendly                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Step 1: Environment Check
echo -e "${CYAN}🔍 STEP 1: Environment Check${NC}"
animate "Checking system requirements"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found! Please install Node.js first.${NC}"
    exit 1
fi

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
    exit 1
fi

cd moderation-bot232
echo -e "${GREEN}✅ Repository cloned successfully${NC}"

# Step 4: SMART MongoDB Cleanup (Preserves Clean MySQL Schemas)
echo -e "${CYAN}🗑️ STEP 4: Smart MongoDB Cleanup${NC}"
animate "Removing ONLY actual MongoDB files"

# Remove old schemas directory if it contains actual mongoose files
if [ -d "src/schemas" ]; then
    echo -e "${YELLOW}🔍 Checking schemas directory...${NC}"
    
    # Check if any schema file actually imports mongoose
    ACTUAL_MONGOOSE=$(find src/schemas -name "*.js" -exec grep -l "require.*['\"]mongoose['\"]" {} \; 2>/dev/null || true)
    ACTUAL_MONGOOSE="$ACTUAL_MONGOOSE $(find src/schemas -name "*.js" -exec grep -l "mongoose\.Schema\|mongoose\.model\|mongoose\.connect" {} \; 2>/dev/null || true)"
    
    if [ ! -z "$ACTUAL_MONGOOSE" ]; then
        echo -e "${YELLOW}⚠️  Found actual MongoDB schema files - removing...${NC}"
        rm -rf src/schemas/
        echo -e "${GREEN}✅ Removed old MongoDB schemas${NC}"
    else
        echo -e "${GREEN}✅ Schemas are clean MySQL files - preserving${NC}"
    fi
fi

# Remove specific problematic files that definitely use mongoose
PROBLEM_FILES=(
    "src/utils/threatScore.js.old"
    "src/commands/admin/threatscore.js.old"
    "src/middleware/automod.js"
    "src/models/mongoose.js"
    "src/models/schemas.js"
)

for file in "${PROBLEM_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file" 2>/dev/null || true
        echo -e "${GREEN}✅ Removed $file${NC}"
    fi
done

# Only remove files that ACTUALLY import mongoose (not just mention it)
echo -e "${YELLOW}🔍 Scanning for ACTUAL mongoose imports...${NC}"

# Look for require('mongoose') or import mongoose
ACTUAL_IMPORTS=$(find . -name "*.js" -type f -exec grep -l "require(['\"]mongoose['\"])" {} \; 2>/dev/null | grep -v node_modules || true)
ACTUAL_IMPORTS="$ACTUAL_IMPORTS $(find . -name "*.js" -type f -exec grep -l "import.*mongoose.*from" {} \; 2>/dev/null | grep -v node_modules || true)"

# Look for mongoose.connect, mongoose.Schema, mongoose.model usage
MONGOOSE_USAGE=$(find . -name "*.js" -type f -exec grep -l "mongoose\.connect\|mongoose\.Schema\|mongoose\.model" {} \; 2>/dev/null | grep -v node_modules || true)

# Combine and remove duplicates
ALL_MONGOOSE=$(echo "$ACTUAL_IMPORTS $MONGOOSE_USAGE" | tr ' ' '\n' | sort -u | grep -v '^$' || true)

if [ ! -z "$ALL_MONGOOSE" ]; then
    echo -e "${YELLOW}⚠️  Found files with actual mongoose usage:${NC}"
    echo "$ALL_MONGOOSE"
    echo "$ALL_MONGOOSE" | xargs rm -f
    echo -e "${GREEN}✅ Removed actual mongoose files${NC}"
else
    echo -e "${GREEN}✅ No actual mongoose imports found${NC}"
    echo -e "${BLUE}💡 Clean MySQL schema files preserved${NC}"
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

# Verify NO actual mongoose imports remain
REMAINING_MONGOOSE=$(find . -name "*.js" -type f -exec grep -l "require(['\"]mongoose['\"])\|mongoose\.connect\|mongoose\.Schema\|mongoose\.model" {} \; 2>/dev/null | grep -v node_modules || true)
if [ ! -z "$REMAINING_MONGOOSE" ]; then
    echo -e "${RED}❌ Still found actual mongoose usage:${NC}"
    echo "$REMAINING_MONGOOSE"
    exit 1
fi

echo -e "${GREEN}✅ All validation checks passed${NC}"
echo -e "${BLUE}💡 Clean MySQL schemas preserved and ready${NC}"

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
echo "• 🗄️ Clean MySQL Schemas (Ticket, Note, Strike, Invite, ThreatScore)"
echo ""
echo -e "${GREEN}🚀 Ready to launch! Your bot is clean and optimized!${NC}"
