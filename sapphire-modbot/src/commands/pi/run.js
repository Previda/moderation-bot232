const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const PiRunner = require('../../schemas/PiRunner');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pi-run')
    .setDescription('Submit a script for the Raspberry Pi runner')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('script').setDescription('Shell script to run').setRequired(true)),
  async execute(interaction) {
    const script = interaction.options.getString('script');
    await PiRunner.create({
      guildID: interaction.guild.id,
      userID: interaction.user.id,
      script,
      status: 'pending'
    });
    await interaction.reply({ content: 'Script submitted for execution on the Pi runner.', ephemeral: true });
  }
};
