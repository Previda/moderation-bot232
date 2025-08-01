k# Sapphire-Class Discord Moderation Bot

A next-generation Discord moderation bot with advanced features:
- Ban system with unique Case IDs
- Appeal system
- Tickets, verification, anti-raid/nuke, Raspberry Pi scripting, and more

## Features
- Discord.js v14+
- MongoDB (Mongoose) or PostgreSQL (Prisma)
- Cross-platform: Windows, VPS, Replit, Raspberry Pi bridge

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
