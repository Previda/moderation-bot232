# Sapphire Moderation Bot - Complete Deployment Guide

## Prerequisites

### On Windows (for development)
1. **Install Node.js**: Download from [nodejs.org](https://nodejs.org/) (v16+ required)
2. **Install Git**: Download from [git-scm.com](https://git-scm.com/)

### On Raspberry Pi (for deployment)
Node.js will be installed automatically by the deploy.sh script.

## Step 1: Push to GitHub (Windows)

```bash
# Add all files to git
git add .

# Commit changes
git commit -m "Add deployment scripts and command registration"

# Push to GitHub
git push origin main
```

## Step 2: Deploy on Raspberry Pi

### Fresh Installation
```bash
# Clone the repository
git clone https://github.com/Previda/sapphire-modbot.git
cd sapphire-modbot

# Run deployment script
bash deploy.sh

# Configure environment variables
nano .env
# Add your DISCORD_TOKEN and MYSQL_URL

# Register Discord slash commands
node register-commands.js

# Start the bot
npm start
```

### Update Existing Installation
```bash
cd sapphire-modbot

# Pull latest changes
git pull

# Install/update dependencies
npm install

# Register/update Discord commands
node register-commands.js

# Restart the bot
npm start
```

## Step 3: Register Discord Slash Commands

The bot includes 42 slash commands that need to be registered with Discord:

### Command Categories:
- **Admin** (8 commands): automod, backup, commands, disaster, setup-channels, setupdate, superuser, threatscore
- **Appeals** (1 command): appeal
- **Economy** (4 commands): balance, daily, reset, work
- **Moderation** (6 commands): ban, kick, mute, slowmode, undo, warn
- **Pi** (2 commands): sysinfo, tempsys
- **Tickets** (3 commands): manage, reverse, ticket
- **Utilities** (2 commands): userinfo, manage

### Registration Process:
1. **First Time Setup**: Run `node register-commands.js` after configuring .env
2. **Global Commands**: Commands are registered globally (available in all servers)
3. **Propagation Time**: May take up to 1 hour for commands to appear
4. **Force Update**: If commands don't appear, kick and re-invite the bot

## Step 4: Verify Deployment

### Check Bot Status
```bash
# View bot logs
npm start

# Check for errors
tail -f ~/.pm2/logs/sapphire-error.log  # If using PM2
```

### Verify Commands in Discord
1. Type `/` in any Discord channel
2. Look for bot commands (should show 42 commands)
3. Test a simple command like `/commands`

## Step 5: Production Deployment (Optional)

### Using PM2 for Auto-restart
```bash
# Install PM2
npm install -g pm2

# Start bot with PM2
pm2 start index.js --name sapphire-bot

# Save PM2 configuration
pm2 save

# Enable auto-start on boot
pm2 startup
```

### Using systemd Service
```bash
# Create service file
sudo nano /etc/systemd/system/sapphire-bot.service

# Add service configuration (see deploy.sh for template)

# Enable and start service
sudo systemctl enable sapphire-bot
sudo systemctl start sapphire-bot
```

## Troubleshooting

### Commands Not Showing
1. Run `node register-commands.js` to register commands
2. Wait up to 1 hour for global propagation
3. Kick and re-invite bot if needed
4. Check bot has `applications.commands` scope

### Database Connection Issues
1. Run `node src/utils/mysqlFix.js` for DNS fixes
2. Check MYSQL_URL format: `mysql://user:pass@host:port/database?ssl-mode=REQUIRED`
3. Verify cloud database is accessible

### Bot Not Starting
1. Check Node.js version: `node --version` (needs v16+)
2. Verify .env file has DISCORD_TOKEN
3. Check error logs for specific issues
4. Run `npm install` to ensure all dependencies

## Environment Variables

Required in `.env`:
```env
DISCORD_TOKEN=your_bot_token_here
MYSQL_URL=mysql://user:password@host:port/database?ssl-mode=REQUIRED
```

Optional:
```env
PI_STATS_WEBHOOK=https://discord.com/api/webhooks/...
MOD_LOG_CHANNEL_ID=channel_id_here
APPEALS_CHANNEL_ID=channel_id_here
```

## Support

- **Repository**: https://github.com/Previda/sapphire-modbot
- **Issues**: https://github.com/Previda/sapphire-modbot/issues
- **License**: MIT
