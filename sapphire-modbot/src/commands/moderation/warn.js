const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Punishment = require('../../schemas/Punishment');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option.setName('user').setDescription('User to warn').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for warning').setRequired(false)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided.';
    await Punishment.create({
      userID: user.id,
      modID: interaction.user.id,
      reason,
      timestamp: new Date(),
      guildID: interaction.guild.id,
      caseID: `CASE-${Math.random().toString(36).substring(2,7).toUpperCase()}`,
      appealStatus: 'open'
    });
    await interaction.reply({ content: `Warned <@${user.id}>.`, ephemeral: true });
    try {
      await user.send(`You have been warned in **${interaction.guild.name}**. Reason: ${reason}`);
    } catch {}
  }
};
