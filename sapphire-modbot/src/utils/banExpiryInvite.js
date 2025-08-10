// Schedule a reinvite for tempbanned users after ban expiry
const Invite = require('../schemas/Invite');
const { v4: uuidv4 } = require('uuid');

async function scheduleBanExpiryInvite(client, guild, userId, banDurationMs, description = '') {
  setTimeout(async () => {
    try {
      // Unban user
      await guild.members.unban(userId, 'Ban expired, auto-unban');
      // Generate invite
      const channel = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('CreateInstantInvite'));
      if (!channel) return;
      const invite = await guild.invites.create(channel.id, {
        maxUses: 1,
        maxAge: 86400,
        unique: true,
        reason: `Ban expiry reinvite for ${userId}`
      });
      await Invite.create({
        code: invite.code,
        guildID: guild.id,
        userID: userId,
        action: 'ban',
        description: description || `Reinvite for <@${userId}> after ban expiry`,
        expiresAt: new Date(Date.now() + 86400000)
      });
      // Try to DM user
      const user = await client.users.fetch(userId).catch(() => null);
      if (user) {
        try {
          await user.send(`Your ban in **${guild.name}** has expired. You may rejoin using this link (valid for 1 use, 24h): https://discord.gg/${invite.code}`);
        } catch {}
      }
    } catch (e) {}
  }, banDurationMs);
}

module.exports = scheduleBanExpiryInvite;
