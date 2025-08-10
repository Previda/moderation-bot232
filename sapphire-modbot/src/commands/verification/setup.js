const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verification-setup')
    .setDescription('Set up verification system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt => opt.setName('role').setDescription('Role to give on verification').setRequired(true))
    .addChannelOption(opt => opt.setName('channel').setDescription('Verification channel').setRequired(true)),
  async execute(interaction) {
    // Store config in DB (reuse AutomodConfig for simplicity)
    const AutomodConfig = require('../../schemas/AutomodConfig');
    const role = interaction.options.getRole('role');
    const channel = interaction.options.getChannel('channel');
    await AutomodConfig.findOneAndUpdate(
      { guildID: interaction.guild.id },
      { verificationRoleId: role.id, verificationChannelId: channel.id },
      { upsert: true }
    );
    await interaction.reply({ content: `Verification configured: role <@&${role.id}>, channel <#${channel.id}>`, ephemeral: true });
  }
};
