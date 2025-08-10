const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const AppealQuestion = require('../../schemas/AppealQuestion');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('appeal-setup')
    .setDescription('Set up appeal questions')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt => opt.setName('questions').setDescription('Questions (separate by |)').setRequired(true)),
  async execute(interaction) {
    const questions = interaction.options.getString('questions').split('|').map(q => q.trim()).filter(Boolean);
    await AppealQuestion.findOneAndUpdate(
      { guildID: interaction.guild.id },
      { questions },
      { upsert: true }
    );
    await interaction.reply({ content: `Appeal questions updated:\n${questions.map((q, i) => `${i+1}. ${q}`).join('\n')}`, ephemeral: true });
  }
};
