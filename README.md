# 🛡️ Sapphire Moderation Bot

> Enterprise-grade Discord moderation bot with advanced backup & disaster recovery

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-blue.svg)](https://discord.js.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange.svg)](https://mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## ✨ Features

- **🔨 42 Advanced Commands** - Complete moderation, economy, tickets, and utility suite
- **💾 Enterprise Backup System** - Automated backups, disaster recovery, server migration
- **🔄 Undo/Reverse Actions** - Reverse any moderation action with comprehensive logging
- **🎫 Advanced Ticketing** - Full ticket management with transcripts and appeals
- **💰 Economy System** - Work commands, balance tracking, daily rewards
- **🤖 Smart Automoderation** - Threat scoring, configurable levels, auto-actions
- **🔐 Security Features** - Verification system, anti-raid, permission management
- **📊 Raspberry Pi Ready** - Optimized for Pi deployment with system monitoring

## 🚀 Quick Start

```bash
# Clone repository
git clone https://github.com/Previda/sapphire-modbot.git
cd sapphire-modbot

# Install dependencies
npm install

# Configure environment
nano .env

# Start bot
npm start
```

## ⚙️ Configuration

Create `.env` file:

```env
# Discord Bot
DISCORD_TOKEN=your_discord_bot_token

# Database (choose one)
MYSQL_URL=mysql://user:pass@host:port/db?ssl-mode=REQUIRED
# OR traditional format:
MYSQL_HOST=localhost
MYSQL_USER=username
MYSQL_PASS=password
MYSQL_DB=database

# Webhooks
PI_STATS_WEBHOOK=https://discord.com/api/webhooks/...
```

## 📋 Commands Overview

| Category | Commands | Description |
|----------|----------|-------------|
| **Moderation** | `/ban` `/kick` `/mute` `/warn` `/undo` | Complete moderation suite with undo functionality |
| **Tickets** | `/ticket` `/reverse` `/transcript` | Advanced ticket management system |
| **Economy** | `/work` `/balance` `/daily` `/reset` | Full economy system with jobs and rewards |
| **Backup** | `/backup` `/disaster` `/manage` | Enterprise disaster recovery tools |
| **Utility** | `/sysinfo` `/tempsys` `/userinfo` | System monitoring and user management |
| **Appeals** | `/appeal` `/appeals-setup` | Comprehensive appeal system |
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
