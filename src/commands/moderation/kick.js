const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option.setName('user').setDescription('User to kick').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for kick').setRequired(false)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided.';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
    if (!member.kickable) return interaction.reply({ content: 'Cannot kick this user.', ephemeral: true });
    await member.kick(reason);
    // Generate one-time invite
    const invite = await interaction.guild.invites.create(interaction.channelId, {
      maxUses: 1,
      maxAge: 86400, // 24 hours
      unique: true,
      reason: `Kick reinvite for ${user.tag}`
    });
    // Save invite to DB
    const Invite = require('../../schemas/Invite');
    await Invite.create({
      code: invite.code,
      guildID: interaction.guild.id,
      userID: user.id,
      action: 'kick',
      description: `Reinvite for ${user.tag} after kick`,
      expiresAt: new Date(Date.now() + 86400000)
    });
    await interaction.reply({ content: `Kicked <@${user.id}>. Reinvite link generated.`, ephemeral: true });
    try {
      await user.send(`You have been kicked from **${interaction.guild.name}**. Reason: ${reason}\nYou may rejoin using this link (valid for 1 use, 24h): https://discord.gg/${invite.code}`);
    } catch {}
  }
};
