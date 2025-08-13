#!/bin/bash

# 🚀 Clean Sapphire ModBot Deployment Script
# This script provides a smooth, error-free deployment experience

set -e  # Exit on any error

echo "🔐 Clean Sapphire ModBot Deployment"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Progress function
progress() {
    echo -e "${BLUE}$1${NC}"
    sleep 1
}

# Success function
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Warning function
warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Error function
error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    warning "Running as root. Consider using a regular user account."
fi

# Clean up old installation
progress "🧹 Cleaning old installation..."
cd /home/admin 2>/dev/null || cd ~
rm -rf moderation-bot232
success "Old files cleaned"

# Clone repository
progress "📥 Cloning fresh repository..."
if ! git clone https://github.com/Previda/moderation-bot232.git; then
    error "Failed to clone repository. Check your internet connection."
fi
cd moderation-bot232
success "Repository cloned successfully"

# Remove problematic MongoDB files
progress "🗑️ Removing old MongoDB files..."
rm -rf src/schemas/ 2>/dev/null || true
rm -f src/utils/threatScore.js 2>/dev/null || true
rm -f src/commands/admin/threatscore.js 2>/dev/null || true

# Check for any remaining mongoose references
MONGOOSE_FILES=$(find . -name "*.js" -exec grep -l "mongoose" {} \; 2>/dev/null | grep -v node_modules || true)
if [ ! -z "$MONGOOSE_FILES" ]; then
    warning "Found files with mongoose references:"
    echo "$MONGOOSE_FILES"
    progress "🔧 Removing problematic files..."
    echo "$MONGOOSE_FILES" | xargs rm -f
fi
success "MongoDB cleanup complete"

# Install dependencies
progress "📦 Installing Node.js packages..."
if ! npm install --production; then
    error "Failed to install npm packages. Check your Node.js installation."
fi
success "Dependencies installed successfully"

# Create .env template
progress "📝 Creating environment template..."
if [ ! -f .env ]; then
    cat > .env << 'EOF'
# Discord Bot Configuration - FILL IN YOUR VALUES
DISCORD_TOKEN=YOUR_DISCORD_TOKEN_HERE
MYSQL_HOST=your_mysql_host
MYSQL_USER=your_mysql_user
MYSQL_PASS=your_mysql_password
MYSQL_DB=your_mysql_database
PI_STATS_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL_HERE
MOD_LOG_CHANNEL_ID=
APPEALS_CHANNEL_ID=
EOF
    success ".env template created"
else
    success ".env file already exists"
fi

# Final checks
progress "🔍 Running final checks..."
if [ ! -f "index.js" ]; then
    error "Main bot file (index.js) not found!"
fi

if [ ! -f "package.json" ]; then
    error "Package.json not found!"
fi

if [ ! -d "src/commands" ]; then
    error "Commands directory not found!"
fi

success "All checks passed"

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Edit your .env file with real credentials:"
echo "   nano .env"
echo ""
echo "2. Start your bot:"
echo "   node index.js"
echo ""
echo -e "${BLUE}💡 Your bot includes:${NC}"
echo "• Advanced moderation (/ban, /kick, /warn, /mute)"
echo "• Interactive ticket system (/ticket, !ticket menu)"
echo "• Appeals system (/appeal, DM commands)"
echo "• Economy system (/balance, /daily, /work)"
echo "• System monitoring (/sysinfo, /tempsys)"
echo "• Global help system (/commands)"
echo ""
echo -e "${GREEN}Ready to deploy! 🚀${NC}"
