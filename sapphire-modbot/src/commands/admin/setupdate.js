const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { setUpdateStatus } = require('../../utils/botStatus');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupdate')
    .setDescription('Set bot update announcement for 1 day')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('text').setDescription('Update announcement').setRequired(true)),
  async execute(interaction) {
    const text = interaction.options.getString('text');
    setUpdateStatus(text);
    await interaction.reply({ content: 'Bot update status set! It will be shown for 1 day.', ephemeral: true });
  }
};
