require('dotenv').config();
const { Client, GatewayIntentBits, SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const os = require('os');
const { exec } = require('child_process');
const axios = require('axios');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages]
});

const dbConfig = { host: process.env.MYSQL_HOST, user: process.env.MYSQL_USER, password: process.env.MYSQL_PASS, database: process.env.MYSQL_DB };
let pool;

async function initDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    const tables = [
      `CREATE TABLE IF NOT EXISTS punishments (id INT AUTO_INCREMENT PRIMARY KEY, userID VARCHAR(255), modID VARCHAR(255), reason TEXT, guildID VARCHAR(255), caseID VARCHAR(255) UNIQUE, type VARCHAR(50), createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS guild_config (id INT AUTO_INCREMENT PRIMARY KEY, guildID VARCHAR(255) UNIQUE, prefix VARCHAR(10) DEFAULT '!', allowedRoles TEXT, automodLevel VARCHAR(50) DEFAULT 'medium', antiSpam BOOLEAN DEFAULT true, antiInvite BOOLEAN DEFAULT true, antiNSFW BOOLEAN DEFAULT true)`,
      `CREATE TABLE IF NOT EXISTS tickets (id INT AUTO_INCREMENT PRIMARY KEY, ticketID VARCHAR(255) UNIQUE, userID VARCHAR(255), guildID VARCHAR(255), channelID VARCHAR(255), category VARCHAR(100), status VARCHAR(50) DEFAULT 'open', createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS appeals (id INT AUTO_INCREMENT PRIMARY KEY, appealID VARCHAR(255) UNIQUE, caseID VARCHAR(255), userID VARCHAR(255), guildID VARCHAR(255), reason TEXT, status VARCHAR(50) DEFAULT 'pending', createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS threat_scores (id INT AUTO_INCREMENT PRIMARY KEY, userID VARCHAR(255), guildID VARCHAR(255), score INT DEFAULT 0, UNIQUE KEY unique_user_guild (userID, guildID))`
    ];
    for (const table of tables) await pool.execute(table);
    console.log('Database initialized');
  } catch (error) {
    console.error('Database error:', error);
  }
}

async function getGuildConfig(guildID) {
  try {
    const [rows] = await pool.execute('SELECT * FROM guild_config WHERE guildID = ?', [guildID]);
    if (rows.length === 0) {
      await pool.execute('INSERT INTO guild_config (guildID) VALUES (?)', [guildID]);
      return { guildID, prefix: '!', allowedRoles: '[]', antiSpam: true, antiInvite: true, antiNSFW: true };
    }
    return rows[0];
  } catch { return { prefix: '!', allowedRoles: '[]' }; }
}

async function hasPermission(member, guildID, requiredPermission) {
  if (member.permissions.has(requiredPermission)) return true;
  const config = await getGuildConfig(guildID);
  const allowedRoles = JSON.parse(config.allowedRoles || '[]');
  return member.roles.cache.some(role => allowedRoles.includes(role.id));
}

// Advanced automoderation
const userMessageHistory = new Map();
async function automoderate(message) {
  if (!message.guild || message.author.bot) return;
  const config = await getGuildConfig(message.guild.id);
  const userKey = `${message.author.id}-${message.guild.id}`;
  let actionTaken = false;
  
  // Anti-spam
  if (config.antiSpam) {
    const history = userMessageHistory.get(userKey) || [];
    history.push({ content: message.content, timestamp: Date.now() });
    const recent = history.filter(msg => Date.now() - msg.timestamp < 30000).slice(-10);
    userMessageHistory.set(userKey, recent);
    const duplicates = recent.filter(msg => msg.content === message.content);
    if (duplicates.length >= 4) {
      await message.delete().catch(() => {});
      actionTaken = true;
    }
  }
  
  // Anti-invite
  if (config.antiInvite && /discord\.gg\/|discord\.com\/invite\//i.test(message.content)) {
    await message.delete().catch(() => {});
    actionTaken = true;
  }
  
  // Anti-NSFW
  if (config.antiNSFW && /(porn|sex|nude|xxx|hentai|nsfw|fuck|shit)/i.test(message.content)) {
    await message.delete().catch(() => {});
    actionTaken = true;
  }
  
  // Caps flood
  const caps = message.content.replace(/[^A-Z]/g, '');
  if (caps.length > 10 && caps.length / message.content.length > 0.7) {
    await message.delete().catch(() => {});
    actionTaken = true;
  }
  
  if (actionTaken) {
    try {
      await pool.execute('INSERT INTO threat_scores (userID, guildID, score) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE score = score + 1', [message.author.id, message.guild.id]);
      await message.author.send(`⚠️ Automod warning in ${message.guild.name}`).catch(() => {});
    } catch {}
  }
}

const commands = [
  new SlashCommandBuilder().setName('config').setDescription('Configure bot settings')
    .addSubcommand(sub => sub.setName('prefix').setDescription('Set prefix').addStringOption(opt => opt.setName('prefix').setDescription('New prefix').setRequired(true)))
    .addSubcommand(sub => sub.setName('roles').setDescription('Manage roles').addStringOption(opt => opt.setName('action').setDescription('Action').setRequired(true).addChoices({name: 'Add', value: 'add'}, {name: 'Remove', value: 'remove'}, {name: 'List', value: 'list'})).addRoleOption(opt => opt.setName('role').setDescription('Role')))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('ban').setDescription('Ban user').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder().setName('kick').setDescription('Kick user').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason')).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  new SlashCommandBuilder().setName('warn').setDescription('Warn user').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('mute').setDescription('Mute user').addUserOption(opt => opt.setName('user').setDescription('User').setRequired(true)).addIntegerOption(opt => opt.setName('duration').setDescription('Minutes').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('ticket').setDescription('Create ticket').addStringOption(opt => opt.setName('category').setDescription('Category').setRequired(true).addChoices({name: 'Support', value: 'support'}, {name: 'Appeal', value: 'appeal'})).addStringOption(opt => opt.setName('description').setDescription('Description').setRequired(true)),
  new SlashCommandBuilder().setName('close').setDescription('Close ticket').setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  new SlashCommandBuilder().setName('appeal').setDescription('Appeal punishment').addStringOption(opt => opt.setName('caseid').setDescription('Case ID').setRequired(true)).addStringOption(opt => opt.setName('reason').setDescription('Reason').setRequired(true)),
  new SlashCommandBuilder().setName('tempsys').setDescription('System stats'),
  new SlashCommandBuilder().setName('ping').setDescription('Bot latency')
];

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  await initDatabase();
  try { await client.application.commands.set(commands); console.log('Commands registered'); } catch (e) { console.error('Command registration error:', e); }
});

client.on('messageCreate', async (message) => {
  if (!message.guild || message.author.bot) return;
  await automoderate(message);
  
  const config = await getGuildConfig(message.guild.id);
  if (!message.content.startsWith(config.prefix)) return;
  
  const args = message.content.slice(config.prefix.length).trim().split(/ +/);
  const cmd = args.shift().toLowerCase();
  
  if (cmd === 'help') {
    const embed = new EmbedBuilder().setTitle('📋 Bot Commands').setDescription(`**Prefix:** \`${config.prefix}\`\n\n**Slash Commands:**\n/ban, /kick, /warn, /mute\n/ticket, /close, /appeal\n/config, /tempsys, /ping`).setColor(0x0099ff);
    await message.reply({ embeds: [embed] });
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  try {
    switch (interaction.commandName) {
      case 'config': await handleConfig(interaction); break;
      case 'ban': await handleBan(interaction); break;
      case 'kick': await handleKick(interaction); break;
      case 'warn': await handleWarn(interaction); break;
      case 'mute': await handleMute(interaction); break;
      case 'ticket': await handleTicket(interaction); break;
      case 'close': await handleClose(interaction); break;
      case 'appeal': await handleAppeal(interaction); break;
      case 'tempsys': await handleTempSys(interaction); break;
      case 'ping': await interaction.reply(`🏓 Pong! ${client.ws.ping}ms`); break;
      default: console.log('Unknown command:', interaction.commandName); await interaction.reply({ content: '❌ Unknown command', ephemeral: true });
    }
  } catch (error) {
    console.error('Command error:', error);
    try { if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '❌ Error occurred', ephemeral: true }); } catch {}
  }
});

async function handleConfig(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'prefix') {
    const newPrefix = interaction.options.getString('prefix');
    if (newPrefix.length > 3) return await interaction.reply({ content: '❌ Prefix must be 1-3 characters', ephemeral: true });
    await pool.execute('UPDATE guild_config SET prefix = ? WHERE guildID = ?', [newPrefix, interaction.guild.id]);
    await interaction.reply(`✅ Prefix changed to: \`${newPrefix}\``);
  } else if (sub === 'roles') {
    const action = interaction.options.getString('action');
    const role = interaction.options.getRole('role');
    const config = await getGuildConfig(interaction.guild.id);
    let allowedRoles = JSON.parse(config.allowedRoles || '[]');
    
    if (action === 'list') {
      const roleNames = allowedRoles.map(id => interaction.guild.roles.cache.get(id)?.name || 'Unknown').join('\n') || 'No roles';
      const embed = new EmbedBuilder().setTitle('📋 Allowed Roles').setDescription(roleNames).setColor(0x0099ff);
      await interaction.reply({ embeds: [embed] });
    } else if (role) {
      if (action === 'add' && !allowedRoles.includes(role.id)) {
        allowedRoles.push(role.id);
        await pool.execute('UPDATE guild_config SET allowedRoles = ? WHERE guildID = ?', [JSON.stringify(allowedRoles), interaction.guild.id]);
        await interaction.reply(`✅ Added role: ${role.name}`);
      } else if (action === 'remove') {
        allowedRoles = allowedRoles.filter(id => id !== role.id);
        await pool.execute('UPDATE guild_config SET allowedRoles = ? WHERE guildID = ?', [JSON.stringify(allowedRoles), interaction.guild.id]);
        await interaction.reply(`✅ Removed role: ${role.name}`);
      } else {
        await interaction.reply('❌ Role already exists or invalid action');
      }
    }
  }
}

async function handleBan(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason';
  try {
    const member = await interaction.guild.members.fetch(user.id);
    await member.ban({ reason: `${reason} (by ${interaction.user.tag})` });
    const caseID = 'CASE-' + uuidv4().slice(0, 8).toUpperCase();
    await pool.execute('INSERT INTO punishments (userID, modID, reason, guildID, caseID, type) VALUES (?, ?, ?, ?, ?, ?)', [user.id, interaction.user.id, reason, interaction.guild.id, caseID, 'ban']);
    try { await user.send(`🔨 Banned from **${interaction.guild.name}**\nReason: ${reason}\nCase: ${caseID}`); } catch {}
    const embed = new EmbedBuilder().setTitle('✅ User Banned').setDescription(`**User:** ${user.tag}\n**Reason:** ${reason}\n**Case:** ${caseID}`).setColor(0x00ff00);
    await interaction.reply({ embeds: [embed] });
  } catch { await interaction.reply({ content: '❌ Failed to ban user', ephemeral: true }); }
}

async function handleKick(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason') || 'No reason';
  try {
    const member = await interaction.guild.members.fetch(user.id);
    await member.kick(`${reason} (by ${interaction.user.tag})`);
    const caseID = 'CASE-' + uuidv4().slice(0, 8).toUpperCase();
    await pool.execute('INSERT INTO punishments (userID, modID, reason, guildID, caseID, type) VALUES (?, ?, ?, ?, ?, ?)', [user.id, interaction.user.id, reason, interaction.guild.id, caseID, 'kick']);
    try { await user.send(`👢 Kicked from **${interaction.guild.name}**\nReason: ${reason}\nCase: ${caseID}`); } catch {}
    const embed = new EmbedBuilder().setTitle('✅ User Kicked').setDescription(`**User:** ${user.tag}\n**Reason:** ${reason}\n**Case:** ${caseID}`).setColor(0x00ff00);
    await interaction.reply({ embeds: [embed] });
  } catch { await interaction.reply({ content: '❌ Failed to kick user', ephemeral: true }); }
}

async function handleWarn(interaction) {
  const user = interaction.options.getUser('user');
  const reason = interaction.options.getString('reason');
  const caseID = 'CASE-' + uuidv4().slice(0, 8).toUpperCase();
  try {
    await pool.execute('INSERT INTO punishments (userID, modID, reason, guildID, caseID, type) VALUES (?, ?, ?, ?, ?, ?)', [user.id, interaction.user.id, reason, interaction.guild.id, caseID, 'warn']);
    try { await user.send(`⚠️ Warned in **${interaction.guild.name}**\nReason: ${reason}\nCase: ${caseID}`); } catch {}
    const embed = new EmbedBuilder().setTitle('✅ User Warned').setDescription(`**User:** ${user.tag}\n**Reason:** ${reason}\n**Case:** ${caseID}`).setColor(0x00ff00);
    await interaction.reply({ embeds: [embed] });
  } catch { await interaction.reply({ content: '❌ Failed to warn user', ephemeral: true }); }
}

async function handleMute(interaction) {
  const user = interaction.options.getUser('user');
  const duration = interaction.options.getInteger('duration');
  const reason = interaction.options.getString('reason') || 'No reason';
  try {
    const member = await interaction.guild.members.fetch(user.id);
    await member.timeout(duration * 60 * 1000, `${reason} (by ${interaction.user.tag})`);
    const caseID = 'CASE-' + uuidv4().slice(0, 8).toUpperCase();
    await pool.execute('INSERT INTO punishments (userID, modID, reason, guildID, caseID, type) VALUES (?, ?, ?, ?, ?, ?)', [user.id, interaction.user.id, reason, interaction.guild.id, caseID, 'mute']);
    try { await user.send(`🔇 Muted in **${interaction.guild.name}**\nReason: ${reason}\nDuration: ${duration}min\nCase: ${caseID}`); } catch {}
    const embed = new EmbedBuilder().setTitle('✅ User Muted').setDescription(`**User:** ${user.tag}\n**Duration:** ${duration}min\n**Case:** ${caseID}`).setColor(0x00ff00);
    await interaction.reply({ embeds: [embed] });
  } catch { await interaction.reply({ content: '❌ Failed to mute user', ephemeral: true }); }
}

async function handleTicket(interaction) {
  const category = interaction.options.getString('category');
  const description = interaction.options.getString('description');
  try {
    const [existing] = await pool.execute('SELECT * FROM tickets WHERE userID = ? AND guildID = ? AND status = "open"', [interaction.user.id, interaction.guild.id]);
    if (existing.length > 0) return await interaction.reply({ content: '❌ You already have an open ticket', ephemeral: true });
    
    const ticketID = 'TICKET-' + uuidv4().slice(0, 8).toUpperCase();
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ]
    });
    
    await pool.execute('INSERT INTO tickets (ticketID, userID, guildID, channelID, category) VALUES (?, ?, ?, ?, ?)', [ticketID, interaction.user.id, interaction.guild.id, channel.id, category]);
    const embed = new EmbedBuilder().setTitle('🎫 Ticket Created').setDescription(`**ID:** ${ticketID}\n**Category:** ${category}\n**Description:** ${description}`).setColor(0x0099ff);
    await channel.send({ content: `<@${interaction.user.id}>`, embeds: [embed] });
    await interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
  } catch { await interaction.reply({ content: '❌ Failed to create ticket', ephemeral: true }); }
}

async function handleClose(interaction) {
  try {
    const [ticket] = await pool.execute('SELECT * FROM tickets WHERE channelID = ? AND status = "open"', [interaction.channel.id]);
    if (ticket.length === 0) return await interaction.reply({ content: '❌ Not a ticket channel', ephemeral: true });
    await pool.execute('UPDATE tickets SET status = "closed" WHERE channelID = ?', [interaction.channel.id]);
    await interaction.reply('🔒 Ticket closed. Deleting in 10s...');
    setTimeout(() => interaction.channel.delete().catch(() => {}), 10000);
  } catch { await interaction.reply({ content: '❌ Failed to close ticket', ephemeral: true }); }
}

async function handleAppeal(interaction) {
  const caseID = interaction.options.getString('caseid');
  const reason = interaction.options.getString('reason');
  try {
    const [punishment] = await pool.execute('SELECT * FROM punishments WHERE caseID = ? AND userID = ?', [caseID, interaction.user.id]);
    if (punishment.length === 0) return await interaction.reply({ content: '❌ Case not found', ephemeral: true });
    
    const appealID = 'APPEAL-' + uuidv4().slice(0, 8).toUpperCase();
    await pool.execute('INSERT INTO appeals (appealID, caseID, userID, guildID, reason) VALUES (?, ?, ?, ?, ?)', [appealID, caseID, interaction.user.id, interaction.guild.id, reason]);
    const embed = new EmbedBuilder().setTitle('✅ Appeal Submitted').setDescription(`**Appeal ID:** ${appealID}\n**Case:** ${caseID}`).setColor(0x00ff00);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch { await interaction.reply({ content: '❌ Failed to submit appeal', ephemeral: true }); }
}

async function handleTempSys(interaction) {
  await interaction.deferReply({ ephemeral: true });
  const cpuUsage = os.loadavg()[0];
  const totalMem = os.totalmem() / (1024 * 1024);
  const freeMem = os.freemem() / (1024 * 1024);
  let temp = 'N/A';
  try {
    temp = await new Promise((resolve) => {
      exec("cat /sys/class/thermal/thermal_zone0/temp", (err, stdout) => {
        resolve(stdout ? (parseInt(stdout) / 1000).toFixed(1) + '°C' : 'N/A');
      });
    });
  } catch {}
  
  const stats = `🖥️ **System Stats**\n🌡️ **Temp:** ${temp}\n⚡ **CPU:** ${cpuUsage.toFixed(2)}\n💾 **RAM:** ${(totalMem - freeMem).toFixed(1)}/${totalMem.toFixed(1)}MB`;
  
  if (process.env.PI_STATS_WEBHOOK) {
    try { await axios.post(process.env.PI_STATS_WEBHOOK, { content: stats }); } catch {}
  }
  
  await interaction.editReply({ content: stats });
}

client.login(process.env.DISCORD_TOKEN);
