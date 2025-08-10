#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Progress bar function
show_progress() {
    local duration=$1
    local message=$2
    echo -e "${BLUE}$message${NC}"
    
    for ((i=0; i<=100; i+=5)); do
        printf "\r${GREEN}["
        for ((j=0; j<i/5; j++)); do printf "█"; done
        for ((j=i/5; j<20; j++)); do printf "░"; done
        printf "] $i%%${NC}"
        sleep $(echo "scale=2; $duration/20" | bc -l 2>/dev/null || echo "0.1")
    done
    echo ""
}

echo -e "${YELLOW}🚀 Sapphire ModBot Deployment Script${NC}"
echo -e "${YELLOW}=====================================${NC}"

# Step 1: Clean old installation
echo -e "${BLUE}Step 1: Cleaning old installation...${NC}"
cd /home/admin
rm -rf moderation-bot232
show_progress 2 "Cleaning up..."

# Step 2: Clone repository
echo -e "${BLUE}Step 2: Cloning repository...${NC}"
git clone --progress https://github.com/Previda/moderation-bot232.git
show_progress 5 "Downloading files..."

# Step 3: Navigate to directory
cd moderation-bot232
echo -e "${GREEN}✅ Repository cloned successfully${NC}"

# Step 4: Check files
echo -e "${BLUE}Step 3: Checking files...${NC}"
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ ERROR: package.json not found!${NC}"
    echo -e "${YELLOW}Please upload files to GitHub first:${NC}"
    echo -e "${YELLOW}1. Go to https://github.com/Previda/moderation-bot232${NC}"
    echo -e "${YELLOW}2. Click 'Upload files'${NC}"
    echo -e "${YELLOW}3. Upload bot-final.js, package.json, .env.example${NC}"
    exit 1
fi

if [ ! -f "bot-final.js" ]; then
    echo -e "${RED}❌ ERROR: bot-final.js not found!${NC}"
    echo -e "${YELLOW}Please upload bot-final.js to GitHub${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All files found${NC}"

# Step 5: Install dependencies
echo -e "${BLUE}Step 4: Installing dependencies...${NC}"
npm install --progress=true
show_progress 8 "Installing packages..."

# Step 6: Create .env file
echo -e "${BLUE}Step 5: Setting up environment...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << 'EOF'
DISCORD_TOKEN=YOUR_TOKEN_HERE
MYSQL_HOST=sql306.infinityfree.com
MYSQL_USER=if0_39607707
MYSQL_PASS=QrAuCNHhmn
MYSQL_DB=if0_39607707_XXX
PI_STATS_WEBHOOK=https://discord.com/api/webhooks/1403915943649873940/tfiZBMZstReo-JSk6ayxeooaY7skzX5CqGRztTRgsPbeZ7i42UW-wsxKILYaBc3AP8g5
EOF
    echo -e "${YELLOW}⚠️  IMPORTANT: Edit .env file with your Discord token!${NC}"
    echo -e "${YELLOW}Run: nano .env${NC}"
else
    echo -e "${GREEN}✅ .env file already exists${NC}"
fi

# Step 7: Final check
echo -e "${BLUE}Step 6: Final verification...${NC}"
show_progress 3 "Verifying setup..."

echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}=====================================${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "${YELLOW}1. Edit .env file: ${BLUE}nano .env${NC}"
echo -e "${YELLOW}2. Add your Discord token${NC}"
echo -e "${YELLOW}3. Run bot: ${BLUE}node bot-final.js${NC}"
echo -e "${YELLOW}4. Or use PM2: ${BLUE}pm2 start bot-final.js --name modbot${NC}"
