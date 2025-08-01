const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(option =>
      option.setName('userid').setDescription('User ID to unban').setRequired(true)
    ),
  async execute(interaction) {
    const userId = interaction.options.getString('userid');
    await interaction.guild.members.unban(userId).catch(() => null);
    // Generate one-time invite
    const channel = interaction.channel;
    const invite = await interaction.guild.invites.create(channel.id, {
      maxUses: 1,
      maxAge: 86400,
      unique: true,
      reason: `Unban reinvite for ${userId}`
    });
    // Save invite to DB
    const Invite = require('../../schemas/Invite');
    await Invite.create({
      code: invite.code,
      guildID: interaction.guild.id,
      userID: userId,
      action: 'unban',
      description: `Reinvite for <@${userId}> after unban`,
      expiresAt: new Date(Date.now() + 86400000)
    });
    await interaction.reply({ content: `Unbanned <@${userId}>. Reinvite link generated.`, ephemeral: true });
    // Try to DM user if possible (only if user is cached)
    const user = await interaction.client.users.fetch(userId).catch(() => null);
    if (user) {
      try {
        await user.send(`You have been unbanned from **${interaction.guild.name}**. You may rejoin using this link (valid for 1 use, 24h): https://discord.gg/${invite.code}`);
      } catch {}
    }
  }
};
