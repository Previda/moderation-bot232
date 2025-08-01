// Invite cleanup: auto-delete invite after use or expiry
const Invite = require('../schemas/Invite');

module.exports = async (client) => {
  // On member join, check if they used a tracked invite
  client.on('guildMemberAdd', async member => {
    const invites = await member.guild.invites.fetch();
    const dbInvites = await Invite.find({ guildID: member.guild.id, used: false });
    for (const dbInvite of dbInvites) {
      const invite = invites.find(i => i.code === dbInvite.code);
      if (!invite || invite.uses > 0) {
        // Mark as used and delete invite
        await Invite.updateOne({ code: dbInvite.code }, { used: true });
        try { await member.guild.invites.delete(dbInvite.code, 'Invite auto-cleanup after use'); } catch {}
      }
    }
  });

  // Periodic cleanup for expired invites
  setInterval(async () => {
    const now = new Date();
    const expired = await Invite.find({ expiresAt: { $lt: now }, used: false });
    for (const dbInvite of expired) {
      try { await member.guild.invites.delete(dbInvite.code, 'Invite expired'); } catch {}
      await Invite.updateOne({ code: dbInvite.code }, { used: true });
    }
  }, 60 * 60 * 1000); // every hour
};
