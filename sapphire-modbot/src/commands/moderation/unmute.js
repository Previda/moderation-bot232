const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option.setName('user').setDescription('User to unmute').setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
    if (!member.moderatable) return interaction.reply({ content: 'Cannot unmute this user.', ephemeral: true });
    await member.timeout(null);
    await interaction.reply({ content: `Unmuted <@${user.id}>.`, ephemeral: true });
    try {
      await user.send(`You have been unmuted in **${interaction.guild.name}**.`);
    } catch {}
  }
};
