# 🍓 Sapphire Bot - Raspberry Pi Quick Start

## One-Command Deployment

```bash
# Clone and deploy in one go
git clone https://github.com/Previda/sapphire-modbot.git && cd sapphire-modbot && bash deploy.sh
```

## Step-by-Step Setup

### 1. Clone Repository
```bash
git clone https://github.com/Previda/sapphire-modbot.git
cd sapphire-modbot
```

### 2. Run Deployment Script
```bash
bash deploy.sh
```

### 3. Configure Environment
```bash
nano .env
```
Add your Discord token and MySQL URL:
```env
DISCORD_TOKEN=your_bot_token_here
MYSQL_URL=mysql://user:pass@host:port/database?ssl-mode=REQUIRED
```

### 4. Register Commands & Start
```bash
node register-commands.js  # Register 42 slash commands
npm start                  # Start the bot
```

## Production Mode

### Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start index.js --name sapphire-bot
pm2 startup
pm2 save
```

### Using Systemd Service
```bash
bash pi-setup.sh          # Creates systemd service
sudo systemctl start sapphire-bot
sudo systemctl enable sapphire-bot
```

## Pi Optimization

### Low Memory Pi (1GB or less)
```bash
bash pi-setup.sh          # Applies memory optimizations
```

### Monitor Performance
```bash
# Check bot status
sudo systemctl status sapphire-bot

# View logs
journalctl -u sapphire-bot -f

# Check memory usage
free -h && ps aux | grep node
```

## Features Ready for Use

- ✅ **42 Slash Commands** - All registered and ready
- ✅ **MySQL Database** - Cloud database support
- ✅ **Backup System** - Automated database backups
- ✅ **Pi System Monitoring** - CPU/memory stats via Discord
- ✅ **Memory Optimized** - Configured for Pi hardware
- ✅ **Auto-restart** - PM2 or systemd service management

## Troubleshooting

**Commands not showing?**
```bash
node register-commands.js  # Re-register commands
```

**Database connection issues?**
```bash
node src/utils/mysqlFix.js  # Apply DNS fixes
```

**Bot won't start?**
```bash
npm install  # Reinstall dependencies
```

**Memory issues?**
```bash
bash pi-setup.sh  # Apply Pi optimizations
```
