require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const { exec } = require('child_process');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// MySQL connection
const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,
  database: process.env.MYSQL_DB
};

// Commands
const commands = [
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user')
    .addUserOption(option => option.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for ban').setRequired(false)),
  
  new SlashCommandBuilder()
    .setName('tempsys')
    .setDescription('Get system stats'),
    
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency')
];

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  // Register commands
  try {
    await client.application.commands.set(commands);
    console.log('Commands registered successfully');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  try {
    switch (interaction.commandName) {
      case 'ban':
        await handleBan(interaction);
        break;
      case 'tempsys':
        await handleTempSys(interaction);
        break;
      case 'ping':
        await interaction.reply(`Pong! Latency: ${client.ws.ping}ms`);
        break;
      default:
        await interaction.reply({ content: 'Unknown command', ephemeral: true });
    }
  } catch (error) {
    console.error('Command error:', error);
    try {
      await interaction.reply({ content: 'An error occurred', ephemeral: true });
    } catch {}
  }
});

async function handleBan(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  try {
    const member = await interaction.guild.members.fetch(user.id);
    await member.ban({ reason: `${reason} (by ${interaction.user.tag})` });
    
    const caseID = 'CASE-' + uuidv4().slice(0, 6).toUpperCase();
    
    // Log to MySQL (basic implementation)
    try {
      const connection = await mysql.createConnection(dbConfig);
      await connection.execute(
        'CREATE TABLE IF NOT EXISTS punishments (id INT AUTO_INCREMENT PRIMARY KEY, userID VARCHAR(255), modID VARCHAR(255), reason TEXT, guildID VARCHAR(255), caseID VARCHAR(255), type VARCHAR(50), createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP)'
      );
      await connection.execute(
        'INSERT INTO punishments (userID, modID, reason, guildID, caseID, type) VALUES (?, ?, ?, ?, ?, ?)',
        [user.id, interaction.user.id, reason, interaction.guild.id, caseID, 'ban']
      );
      await connection.end();
    } catch (dbError) {
      console.error('Database error:', dbError);
    }
    
    // DM user
    try {
      await user.send(`You have been banned from **${interaction.guild.name}**.\nReason: ${reason}\nCase ID: ${caseID}`);
    } catch {}
    
    await interaction.reply(`User ${user.tag} has been banned. Case ID: ${caseID}`);
  } catch (error) {
    await interaction.reply({ content: 'Failed to ban user', ephemeral: true });
  }
}

async function handleTempSys(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  // Get system stats
  const cpuUsage = os.loadavg()[0];
  const totalMem = os.totalmem() / (1024 * 1024);
  const freeMem = os.freemem() / (1024 * 1024);
  const usedMem = totalMem - freeMem;
  
  // Get Pi temperature
  let temp = 'N/A';
  try {
    temp = await new Promise((resolve) => {
      exec("cat /sys/class/thermal/thermal_zone0/temp", (err, stdout) => {
        if (stdout) {
          resolve((parseInt(stdout) / 1000).toFixed(1) + '°C');
        } else {
          resolve('N/A');
        }
      });
    });
  } catch {}
  
  const stats = `**System Stats:**\nCPU Temp: ${temp}\nCPU Load: ${cpuUsage.toFixed(2)}\nRAM: ${usedMem.toFixed(1)}MB / ${totalMem.toFixed(1)}MB`;
  
  // Send to webhook
  if (process.env.PI_STATS_WEBHOOK) {
    try {
      await axios.post(process.env.PI_STATS_WEBHOOK, { content: stats });
    } catch {}
  }
  
  await interaction.editReply({ content: stats });
}

client.login(process.env.DISCORD_TOKEN);
