const { SlashCommandBuilder } = require('discord.js');
const { isSuperuser } = require('../../utils/superuser');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('superuser')
    .setDescription('Superuser-only command')
    .addStringOption(opt => opt.setName('action').setDescription('Action').setRequired(true)),
  async execute(interaction) {
    if (!isSuperuser(interaction.user.id)) return interaction.reply({ content: 'You are not authorized.', ephemeral: true });
    const action = interaction.options.getString('action');
    // Add superuser actions here
    await interaction.reply({ content: `Superuser action executed: ${action}`, ephemeral: true });
  }
};
