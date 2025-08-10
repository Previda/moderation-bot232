k# Sapphire ModBot - MySQL Edition

A next-generation Discord moderation bot with advanced features, fully migrated to MySQL for Raspberry Pi deployment.

## Features

* **MySQL-only backend** (MongoDB fully removed)
* **Ban system with unique Case IDs**
* **Appeal system**
* **Tickets, verification, anti-raid protection**
* **Pi system monitoring** with `/tempsys` command
* **Webhook integration** for system stats
* **Robust error handling** (won't crash on invalid commands)
* **Raspberry Pi OS Lite compatible** (headless deployment)

## Tech Stack

* Discord.js v14+
* MySQL (InfinityFree hosting compatible)
* Node.js 16+
* Raspberry Pi OS Lite ready

## Quick Setup

### 1. Clone Repository
```bash
git clone https://github.com/Previda/moderation-bot232.git
cd moderation-bot232
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Run Bot
```bash
npm start
```

## Environment Variables

Required in `.env` file:
```
DISCORD_TOKEN=your-bot-token
MYSQL_HOST=your-mysql-host
MYSQL_USER=your-mysql-user
MYSQL_PASS=your-mysql-password
MYSQL_DB=your-mysql-database
PI_STATS_WEBHOOK=https://discord.com/api/webhooks/your-webhook-url
```

## Raspberry Pi Deployment

This bot is optimized for **Raspberry Pi OS Lite** (headless):

1. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone and setup:**
   ```bash
   git clone https://github.com/Previda/moderation-bot232.git
   cd moderation-bot232
   npm install
   ```

3. **Configure `.env` file with your credentials**

4. **Run with PM2 (recommended):**
   ```bash
   sudo npm install -g pm2
   pm2 start index.js --name "modbot"
   pm2 startup
   pm2 save
   ```

## Commands

* `/ban` - Ban a user with case ID
* `/kick` - Kick a user
* `/warn` - Warn a user
* `/mute` / `/unmute` - Timeout management
* `/tempsys` - Get Pi system stats (CPU temp, RAM, disk usage)
* `/commands` - List all available commands

## System Monitoring

The `/tempsys` command provides:
* CPU temperature (Pi-specific)
* CPU load average
* RAM usage
* Disk usage
* Automatic webhook notifications

Perfect for monitoring your Pi deployment remotely!

## File Structure
```
/src
  /commands
    /moderation
    /tickets
    /admin
    /verification
    /raspberry
    /appeals
  /events
  /middleware
  /utils
  /schemas
  /config
/scripts
.env
index.js
README.md
```

## Setup Guide
1. Clone repo
2. Install dependencies
3. Configure `.env`
4. Run `node index.js`

---

## Core Module: Ban System + Case ID + Appeals Entry
This module provides `/ban`, unique Case ID, DM to banned user, DB logging, and `/appeal` entry point.

---

For full features, see the project documentation.
