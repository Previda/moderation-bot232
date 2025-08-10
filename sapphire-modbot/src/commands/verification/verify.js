const { SlashCommandBuilder, ComponentType, ActionRowBuilder, TextInputBuilder, ModalBuilder, TextInputStyle } = require('discord.js');
const Verification = require('../../schemas/Verification');
const AutomodConfig = require('../../schemas/AutomodConfig');

function randomCode(len = 6) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify yourself to get access.'),
  async execute(interaction) {
    const config = await AutomodConfig.findOne({ guildID: interaction.guild.id });
    if (!config || !config.verificationRoleId) {
      return interaction.reply({ content: 'Verification system not configured.', ephemeral: true });
    }
    // Check if already verified
    const existing = await Verification.findOne({ guildID: interaction.guild.id, userID: interaction.user.id, status: 'verified' });
    if (existing) {
      return interaction.reply({ content: 'You are already verified.', ephemeral: true });
    }
    // Generate code and DM user
    const code = randomCode(6);
    await Verification.findOneAndUpdate(
      { guildID: interaction.guild.id, userID: interaction.user.id },
      { code, status: 'pending', createdAt: new Date() },
      { upsert: true }
    );
    try {
      await interaction.user.send(`Your verification code for **${interaction.guild.name}** is: **${code}**\nReturn to the server and enter it below.`);
    } catch {
      return interaction.reply({ content: 'Unable to DM you. Please enable DMs and try again.', ephemeral: true });
    }
    // Show modal to enter code
    const modal = new ModalBuilder()
      .setCustomId('verifyModal')
      .setTitle('Enter Verification Code')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('code')
            .setLabel('Verification Code')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );
    await interaction.showModal(modal);
  },
  async modalSubmit(interaction) {
    const codeInput = interaction.fields.getTextInputValue('code').toUpperCase();
    const record = await Verification.findOne({ guildID: interaction.guild.id, userID: interaction.user.id });
    if (!record || record.status !== 'pending' || record.code !== codeInput) {
      return interaction.reply({ content: 'Invalid or expired verification code.', ephemeral: true });
    }
    record.status = 'verified';
    record.verifiedAt = new Date();
    await record.save();
    // Grant role
    const config = await AutomodConfig.findOne({ guildID: interaction.guild.id });
    const member = await interaction.guild.members.fetch(interaction.user.id);
    await member.roles.add(config.verificationRoleId);
    await interaction.reply({ content: 'You have been verified and granted access!', ephemeral: true });
  }
};
