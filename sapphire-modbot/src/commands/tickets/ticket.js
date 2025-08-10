const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system')
    .addSubcommand(sub =>
      sub.setName('open').setDescription('Open a support ticket')
    )
    .addSubcommand(sub =>
      sub.setName('close').setDescription('Close your ticket')
    )
    .addSubcommand(sub =>
      sub.setName('add').setDescription('Add a user to the ticket').addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true)))
    .addSubcommand(sub =>
      sub.setName('remove').setDescription('Remove a user from the ticket').addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true))),
  async execute(interaction) {
    // Ticket system logic to be implemented
    await interaction.reply({ content: 'Ticket system coming soon!', ephemeral: true });
  }
};
