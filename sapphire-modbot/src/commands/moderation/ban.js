const { SlashCommandBuilder } = require('discord.js');
const { createPunishment } = require('../../models/Punishment');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user by mention or user ID with a reason and unique Case ID.')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to ban').setRequired(false)
    )
    .addStringOption(option =>
      option.setName('userid').setDescription('User ID to ban').setRequired(false)
    )
    .addStringOption(option =>
      option.setName('reason').setDescription('Reason for ban').setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const userId = user ? user.id : interaction.options.getString('userid');
    const reason = interaction.options.getString('reason');
    if (!userId) return interaction.reply({ content: 'Please specify a user or user ID.', ephemeral: true });
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!member) return interaction.reply({ content: 'User not found in this server.', ephemeral: true });
    // Ban
    await member.ban({ reason: `${reason} (by ${interaction.user.tag})` });
    // Generate Case ID
    const caseID = 'CASE-' + uuidv4().slice(0, 6).toUpperCase();
    // Log to MySQL
    await createPunishment({
      userID: userId,
      modID: interaction.user.id,
      reason,
      guildID: interaction.guild.id,
      caseID
    });
    // DM user
    try {
      await member.send(`You have been banned from **${interaction.guild.name}**.\nReason: ${reason}\nCase ID: ${caseID}`);
    } catch {}
    await interaction.reply({ content: `User <@${userId}> has been banned. Case ID: ${caseID}`, ephemeral: false });
  }
};
