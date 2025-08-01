const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pi')
    .setDescription('Run Raspberry Pi script')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName('script').setDescription('Script name to run').setRequired(true)
    ),
  async execute(interaction) {
    // Pi runner logic to be implemented
    await interaction.reply({ content: 'Pi runner coming soon!', ephemeral: true });
  }
};
