#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Progress bar with percentage
progress_bar() {
    local current=$1
    local total=$2
    local message=$3
    local percent=$((current * 100 / total))
    local filled=$((percent / 5))
    local empty=$((20 - filled))
    
    printf "\r${CYAN}$message ${GREEN}["
    for ((i=0; i<filled; i++)); do printf "█"; done
    for ((i=0; i<empty; i++)); do printf "░"; done
    printf "] ${YELLOW}$percent%%${NC}"
    
    if [ $current -eq $total ]; then
        echo ""
    fi
}

# Animated loading dots
loading_dots() {
    local message=$1
    local duration=$2
    echo -ne "${BLUE}$message${NC}"
    for ((i=0; i<duration; i++)); do
        echo -ne "."
        sleep 0.5
    done
    echo -e " ${GREEN}Done!${NC}"
}

clear
echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        🤖 Sapphire ModBot Setup      ║${NC}"
echo -e "${CYAN}║     Advanced Discord Moderation     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
echo ""

# Step 1: Fix directory issue
echo -e "${BLUE}🔧 Step 1: Fixing directory issues...${NC}"
cd /home/admin || cd ~
pwd
progress_bar 1 6 "Navigating to home directory"
sleep 1

# Step 2: Clean old installation
echo -e "${BLUE}🧹 Step 2: Cleaning old installation...${NC}"
rm -rf moderation-bot232 2>/dev/null
progress_bar 2 6 "Removing old files"
sleep 1

# Step 3: Clone repository
echo -e "${BLUE}📥 Step 3: Downloading bot from GitHub...${NC}"
if git clone https://github.com/Previda/moderation-bot232.git; then
    progress_bar 3 6 "Repository cloned successfully"
else
    echo -e "${RED}❌ Failed to clone repository${NC}"
    echo -e "${YELLOW}Make sure files are uploaded to GitHub first!${NC}"
    exit 1
fi
sleep 1

# Step 4: Navigate and check files
echo -e "${BLUE}📂 Step 4: Checking downloaded files...${NC}"
cd moderation-bot232

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ ERROR: package.json missing!${NC}"
    echo -e "${YELLOW}Upload files to GitHub:${NC}"
    echo -e "${YELLOW}https://github.com/Previda/moderation-bot232${NC}"
    exit 1
fi

if [ ! -f "bot-final.js" ]; then
    echo -e "${RED}❌ ERROR: bot-final.js missing!${NC}"
    echo -e "${YELLOW}Upload bot-final.js to GitHub${NC}"
    exit 1
fi

progress_bar 4 6 "Files verified"
sleep 1

# Step 5: Install dependencies
echo -e "${BLUE}📦 Step 5: Installing Node.js packages...${NC}"
loading_dots "Installing dependencies" 6
npm install --silent
progress_bar 5 6 "Dependencies installed"
sleep 1

# Step 6: Setup environment
echo -e "${BLUE}⚙️ Step 6: Creating configuration...${NC}"
cat > .env << 'EOF'
DISCORD_TOKEN=YOUR_DISCORD_TOKEN_HERE
MYSQL_HOST=sql306.infinityfree.com
MYSQL_USER=if0_39607707
MYSQL_PASS=QrAuCNHhmn
MYSQL_DB=if0_39607707_XXX
PI_STATS_WEBHOOK=https://discord.com/api/webhooks/1403915943649873940/tfiZBMZstReo-JSk6ayxeooaY7skzX5CqGRztTRgsPbeZ7i42UW-wsxKILYaBc3AP8g5
EOF

echo -e "${YELLOW}⚠️  IMPORTANT: Update your Discord token in .env file!${NC}"
echo -e "${CYAN}   nano .env${NC}"
echo -e "${CYAN}   Replace YOUR_DISCORD_TOKEN_HERE with your actual token${NC}"

progress_bar 6 6 "Configuration complete"
echo ""

# Success message
echo -e "${GREEN}🎉 Installation Complete!${NC}"
echo -e "${GREEN}=========================${NC}"
echo ""
echo -e "${YELLOW}🚀 To start your bot:${NC}"
echo -e "${CYAN}   node bot-final.js${NC}"
echo ""
echo -e "${YELLOW}🔄 To run with auto-restart:${NC}"
echo -e "${CYAN}   npm install -g pm2${NC}"
echo -e "${CYAN}   pm2 start bot-final.js --name modbot${NC}"
echo -e "${CYAN}   pm2 startup${NC}"
echo -e "${CYAN}   pm2 save${NC}"
echo ""
echo -e "${YELLOW}📊 To check system stats:${NC}"
echo -e "${CYAN}   Use /tempsys command in Discord${NC}"
echo ""
echo -e "${GREEN}✅ Your bot is ready for deployment!${NC}"
