const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const AutomodConfig = require('../../schemas/AutomodConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('appeals-channel')
    .setDescription('Set the channel for appeal logs')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('Appeal log channel').setRequired(true)),
  async execute(interaction) {
    const channel = interaction.options.getChannel('channel');
    await AutomodConfig.findOneAndUpdate(
      { guildID: interaction.guild.id },
      { appealsChannelId: channel.id },
      { upsert: true }
    );
    await interaction.reply({ content: `Appeals log channel set to <#${channel.id}>`, ephemeral: true });
  }
};
