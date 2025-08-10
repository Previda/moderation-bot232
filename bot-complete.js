require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// MySQL connection
const dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,
  database: process.env.MYSQL_DB
};

let pool;

// Initialize database
async function initDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    
    const tables = [
      `CREATE TABLE IF NOT EXISTS punishments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userID VARCHAR(255) NOT NULL,
        modID VARCHAR(255) NOT NULL,
        reason TEXT,
        guildID VARCHAR(255) NOT NULL,
        caseID VARCHAR(255) UNIQUE NOT NULL,
        type VARCHAR(50) NOT NULL,
        duration INT DEFAULT NULL,
        expiresAt TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticketID VARCHAR(255) UNIQUE NOT NULL,
        userID VARCHAR(255) NOT NULL,
        guildID VARCHAR(255) NOT NULL,
        channelID VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'general',
        status VARCHAR(50) DEFAULT 'open',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS appeals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appealID VARCHAR(255) UNIQUE NOT NULL,
        caseID VARCHAR(255) NOT NULL,
        userID VARCHAR(255) NOT NULL,
        guildID VARCHAR(255) NOT NULL,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userID VARCHAR(255) NOT NULL,
        guildID VARCHAR(255) NOT NULL,
        modID VARCHAR(255) NOT NULL,
        note TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];
    
    for (const table of tables) {
      await pool.execute(table);
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Commands
const commands = [
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user')
    .addUserOption(option => option.setName('user').setDescription('User to ban').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for ban'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user')
    .addUserOption(option => option.setName('user').setDescription('User to kick').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for kick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(option => option.setName('user').setDescription('User to warn').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for warning').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a user')
    .addUserOption(option => option.setName('user').setDescription('User to mute').setRequired(true))
    .addIntegerOption(option => option.setName('duration').setDescription('Duration in minutes').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for mute'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Remove timeout from a user')
    .addUserOption(option => option.setName('user').setDescription('User to unmute').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
  new SlashCommandBuilder()
    .setName('note')
    .setDescription('Add a note to a user')
    .addUserOption(option => option.setName('user').setDescription('User to add note to').setRequired(true))
    .addStringOption(option => option.setName('note').setDescription('Note content').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
  new SlashCommandBuilder()
    .setName('modstats')
    .setDescription('View moderation statistics')
    .addUserOption(option => option.setName('user').setDescription('User to view stats for'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Create a support ticket')
    .addStringOption(option => option.setName('category').setDescription('Ticket category').setRequired(true)
      .addChoices(
        { name: 'General Support', value: 'general' },
        { name: 'Bug Report', value: 'bug' },
        { name: 'Appeal', value: 'appeal' }
      ))
    .addStringOption(option => option.setName('description').setDescription('Describe your issue').setRequired(true)),
    
  new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
  new SlashCommandBuilder()
    .setName('appeal')
    .setDescription('Appeal a punishment')
    .addStringOption(option => option.setName('caseid').setDescription('Case ID to appeal').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Why should this be appealed?').setRequired(true)),
    
  new SlashCommandBuilder()
    .setName('tempsys')
    .setDescription('Get system stats'),
    
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency')
];

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await initDatabase();
  
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
      case 'ban': await handleBan(interaction); break;
      case 'kick': await handleKick(interaction); break;
      case 'warn': await handleWarn(interaction); break;
      case 'mute': await handleMute(interaction); break;
      case 'unmute': await handleUnmute(interaction); break;
      case 'note': await handleNote(interaction); break;
      case 'modstats': await handleModStats(interaction); break;
      case 'ticket': await handleTicket(interaction); break;
      case 'close': await handleClose(interaction); break;
      case 'appeal': await handleAppeal(interaction); break;
      case 'tempsys': await handleTempSys(interaction); break;
      case 'ping': await interaction.reply(`Pong! ${client.ws.ping}ms`); break;
      default:
        console.log('Unknown command:', interaction.commandName);
        await interaction.reply({ content: 'Unknown command', ephemeral: true });
    }
  } catch (error) {
    console.error('Command error:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'An error occurred', ephemeral: true });
      }
    } catch {}
  }
});

async function handleBan(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  try {
    const member = await interaction.guild.members.fetch(user.id);
    await member.ban({ reason: `${reason} (by ${interaction.user.tag})` });
    
    const caseID = 'CASE-' + uuidv4().slice(0, 8).toUpperCase();
    
    await pool.execute(
      'INSERT INTO punishments (userID, modID, reason, guildID, caseID, type) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, interaction.user.id, reason, interaction.guild.id, caseID, 'ban']
    );
    
    try {
      await user.send(`You have been banned from **${interaction.guild.name}**.\nReason: ${reason}\nCase ID: ${caseID}`);
    } catch {}
    
    const embed = new EmbedBuilder()
      .setTitle('✅ User Banned')
      .setDescription(`**User:** ${user.tag}\n**Reason:** ${reason}\n**Case ID:** ${caseID}`)
      .setColor(0x00ff00)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ content: 'Failed to ban user', ephemeral: true });
  }
}

async function handleKick(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  try {
    const member = await interaction.guild.members.fetch(user.id);
    await member.kick(`${reason} (by ${interaction.user.tag})`);
    
    const caseID = 'CASE-' + uuidv4().slice(0, 8).toUpperCase();
    
    await pool.execute(
      'INSERT INTO punishments (userID, modID, reason, guildID, caseID, type) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, interaction.user.id, reason, interaction.guild.id, caseID, 'kick']
    );
    
    try {
      await user.send(`You have been kicked from **${interaction.guild.name}**.\nReason: ${reason}\nCase ID: ${caseID}`);
    } catch {}
    
    const embed = new EmbedBuilder()
      .setTitle('✅ User Kicked')
      .setDescription(`**User:** ${user.tag}\n**Reason:** ${reason}\n**Case ID:** ${caseID}`)
      .setColor(0x00ff00)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ content: 'Failed to kick user', ephemeral: true });
  }
}

async function handleWarn(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  
  const caseID = 'CASE-' + uuidv4().slice(0, 8).toUpperCase();
  
  try {
    await pool.execute(
      'INSERT INTO punishments (userID, modID, reason, guildID, caseID, type) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, interaction.user.id, reason, interaction.guild.id, caseID, 'warn']
    );
    
    try {
      await user.send(`You have been warned in **${interaction.guild.name}**.\nReason: ${reason}\nCase ID: ${caseID}`);
    } catch {}
    
    const embed = new EmbedBuilder()
      .setTitle('✅ User Warned')
      .setDescription(`**User:** ${user.tag}\n**Reason:** ${reason}\n**Case ID:** ${caseID}`)
      .setColor(0x00ff00)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ content: 'Failed to warn user', ephemeral: true });
  }
}

async function handleMute(interaction) {
  const user = interaction.options.getUser('user');
  const duration = interaction.options.getInteger('duration');
  const reason = interaction.options.getString('reason') || 'No reason provided';
  
  try {
    const member = await interaction.guild.members.fetch(user.id);
    await member.timeout(duration * 60 * 1000, `${reason} (by ${interaction.user.tag})`);
    
    const caseID = 'CASE-' + uuidv4().slice(0, 8).toUpperCase();
    
    await pool.execute(
      'INSERT INTO punishments (userID, modID, reason, guildID, caseID, type, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.id, interaction.user.id, reason, interaction.guild.id, caseID, 'mute', duration]
    );
    
    try {
      await user.send(`You have been muted in **${interaction.guild.name}**.\nReason: ${reason}\nDuration: ${duration} minutes\nCase ID: ${caseID}`);
    } catch {}
    
    const embed = new EmbedBuilder()
      .setTitle('✅ User Muted')
      .setDescription(`**User:** ${user.tag}\n**Reason:** ${reason}\n**Duration:** ${duration} minutes\n**Case ID:** ${caseID}`)
      .setColor(0x00ff00)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ content: 'Failed to mute user', ephemeral: true });
  }
}

async function handleUnmute(interaction) {
  const user = interaction.options.getUser('user');
  
  try {
    const member = await interaction.guild.members.fetch(user.id);
    await member.timeout(null, `Unmuted by ${interaction.user.tag}`);
    
    const embed = new EmbedBuilder()
      .setTitle('✅ User Unmuted')
      .setDescription(`**User:** ${user.tag}`)
      .setColor(0x00ff00)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ content: 'Failed to unmute user', ephemeral: true });
  }
}

async function handleNote(interaction) {
  const user = interaction.options.getUser('user');
  const note = interaction.options.getString('note');
  
  try {
    await pool.execute(
      'INSERT INTO user_notes (userID, guildID, modID, note) VALUES (?, ?, ?, ?)',
      [user.id, interaction.guild.id, interaction.user.id, note]
    );
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Note Added')
      .setDescription(`**User:** ${user.tag}\n**Note:** ${note}`)
      .setColor(0x00ff00)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ content: 'Failed to add note', ephemeral: true });
  }
}

async function handleModStats(interaction) {
  const user = interaction.options.getUser('user');
  const targetUser = user || interaction.user;
  
  try {
    const [punishments] = await pool.execute(
      'SELECT type, COUNT(*) as count FROM punishments WHERE userID = ? AND guildID = ? GROUP BY type',
      [targetUser.id, interaction.guild.id]
    );
    
    const [notes] = await pool.execute(
      'SELECT note FROM user_notes WHERE userID = ? AND guildID = ? ORDER BY createdAt DESC LIMIT 3',
      [targetUser.id, interaction.guild.id]
    );
    
    const embed = new EmbedBuilder()
      .setTitle(`📊 Stats for ${targetUser.tag}`)
      .setColor(0x0099ff)
      .setTimestamp();
    
    if (punishments.length > 0) {
      const statsText = punishments.map(p => `**${p.type}:** ${p.count}`).join('\n');
      embed.addFields({ name: 'Punishments', value: statsText });
    } else {
      embed.addFields({ name: 'Punishments', value: 'No punishments' });
    }
    
    if (notes.length > 0) {
      const notesText = notes.map(n => `• ${n.note.substring(0, 50)}...`).join('\n');
      embed.addFields({ name: 'Recent Notes', value: notesText });
    }
    
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply({ content: 'Failed to fetch stats', ephemeral: true });
  }
}

async function handleTicket(interaction) {
  const category = interaction.options.getString('category');
  const description = interaction.options.getString('description');
  
  try {
    const [existing] = await pool.execute(
      'SELECT * FROM tickets WHERE userID = ? AND guildID = ? AND status = "open"',
      [interaction.user.id, interaction.guild.id]
    );
    
    if (existing.length > 0) {
      return await interaction.reply({ content: 'You already have an open ticket!', ephemeral: true });
    }
    
    const ticketID = 'TICKET-' + uuidv4().slice(0, 8).toUpperCase();
    
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
      ],
    });
    
    await pool.execute(
      'INSERT INTO tickets (ticketID, userID, guildID, channelID, category) VALUES (?, ?, ?, ?, ?)',
      [ticketID, interaction.user.id, interaction.guild.id, channel.id, category]
    );
    
    const embed = new EmbedBuilder()
      .setTitle('🎫 Support Ticket')
      .setDescription(`**ID:** ${ticketID}\n**Category:** ${category}\n**Description:** ${description}`)
      .setColor(0x0099ff)
      .setTimestamp();
    
    await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed] });
    await interaction.reply({ content: `Ticket created! ${channel}`, ephemeral: true });
  } catch (error) {
    await interaction.reply({ content: 'Failed to create ticket', ephemeral: true });
  }
}

async function handleClose(interaction) {
  try {
    const [ticket] = await pool.execute(
      'SELECT * FROM tickets WHERE channelID = ? AND status = "open"',
      [interaction.channel.id]
    );
    
    if (ticket.length === 0) {
      return await interaction.reply({ content: 'This is not a ticket channel', ephemeral: true });
    }
    
    await pool.execute(
      'UPDATE tickets SET status = "closed" WHERE channelID = ?',
      [interaction.channel.id]
    );
    
    await interaction.reply('🔒 Ticket closed. Channel will be deleted in 10 seconds.');
    
    setTimeout(async () => {
      try {
        await interaction.channel.delete();
      } catch {}
    }, 10000);
  } catch (error) {
    await interaction.reply({ content: 'Failed to close ticket', ephemeral: true });
  }
}

async function handleAppeal(interaction) {
  const caseID = interaction.options.getString('caseid');
  const reason = interaction.options.getString('reason');
  
  try {
    const [punishment] = await pool.execute(
      'SELECT * FROM punishments WHERE caseID = ? AND userID = ?',
      [caseID, interaction.user.id]
    );
    
    if (punishment.length === 0) {
      return await interaction.reply({ content: 'Case ID not found or not yours', ephemeral: true });
    }
    
    const [existing] = await pool.execute(
      'SELECT * FROM appeals WHERE caseID = ? AND userID = ?',
      [caseID, interaction.user.id]
    );
    
    if (existing.length > 0) {
      return await interaction.reply({ content: 'You already appealed this case', ephemeral: true });
    }
    
    const appealID = 'APPEAL-' + uuidv4().slice(0, 8).toUpperCase();
    
    await pool.execute(
      'INSERT INTO appeals (appealID, caseID, userID, guildID, reason) VALUES (?, ?, ?, ?, ?)',
      [appealID, caseID, interaction.user.id, interaction.guild.id, reason]
    );
    
    const embed = new EmbedBuilder()
      .setTitle('✅ Appeal Submitted')
      .setDescription(`**Appeal ID:** ${appealID}\n**Case ID:** ${caseID}\n**Reason:** ${reason}`)
      .setColor(0x00ff00)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    await interaction.reply({ content: 'Failed to submit appeal', ephemeral: true });
  }
}

async function handleTempSys(interaction) {
  await interaction.deferReply({ ephemeral: true });
  
  const cpuUsage = os.loadavg()[0];
  const totalMem = os.totalmem() / (1024 * 1024);
  const freeMem = os.freemem() / (1024 * 1024);
  const usedMem = totalMem - freeMem;
  
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
  
  const stats = `**🖥️ System Stats:**\n🌡️ **CPU Temp:** ${temp}\n⚡ **CPU Load:** ${cpuUsage.toFixed(2)}\n💾 **RAM:** ${usedMem.toFixed(1)}MB / ${totalMem.toFixed(1)}MB`;
  
  if (process.env.PI_STATS_WEBHOOK) {
    try {
      await axios.post(process.env.PI_STATS_WEBHOOK, { content: stats });
    } catch {}
  }
  
  await interaction.editReply({ content: stats });
}

client.login(process.env.DISCORD_TOKEN);
