const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Softban (ban and unban) a user to delete messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option.setName('user').setDescription('User to softban').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for softban').setRequired(false)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided.';
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not found.', ephemeral: true });
    if (!member.bannable) return interaction.reply({ content: 'Cannot softban this user.', ephemeral: true });
    await member.ban({ reason, deleteMessageSeconds: 604800 });
    await interaction.guild.members.unban(user.id, 'Softban unban');
    await interaction.reply({ content: `Softbanned <@${user.id}>.`, ephemeral: true });
    try {
      await user.send(`You have been softbanned in **${interaction.guild.name}**. Reason: ${reason}`);
    } catch {}
  }
};
