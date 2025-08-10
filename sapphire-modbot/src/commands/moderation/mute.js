const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user for a duration (seconds)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option.setName('user').setDescription('User to mute').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('duration').setDescription('Duration in seconds').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for mute').setRequired(false)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const duration = interaction.options.getInteger('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided.';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
    if (!member.moderatable) return interaction.reply({ content: 'Cannot mute this user.', ephemeral: true });
    await member.timeout(duration * 1000, reason);
    await interaction.reply({ content: `Muted <@${user.id}> for ${duration} seconds.`, ephemeral: true });
    try {
      await user.send(`You have been muted in **${interaction.guild.name}** for ${duration} seconds. Reason: ${reason}`);
    } catch {}
  }
};
