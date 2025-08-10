const AutomodConfig = require('../schemas/AutomodConfig');

module.exports = async (client) => {
  client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;
    const guild = reaction.message.guild;
    if (!guild) return;
    const config = await AutomodConfig.findOne({ guildID: guild.id });
    if (!config || !config.verificationChannelId || !config.verificationRoleId) return;
    if (reaction.message.channel.id !== config.verificationChannelId) return;
    // Grant role
    const member = await guild.members.fetch(user.id);
    if (!member.roles.cache.has(config.verificationRoleId)) {
      await member.roles.add(config.verificationRoleId);
      await user.send(`You have been verified in **${guild.name}**!`);
    }
  });
};
