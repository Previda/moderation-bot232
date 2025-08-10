const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Note = require('../../schemas/Note');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('note')
    .setDescription('Add a note to a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(option =>
      option.setName('user').setDescription('User to note').setRequired(true)
    )
    .addStringOption(option =>
      option.setName('note').setDescription('Note content').setRequired(true)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser('user');
    const note = interaction.options.getString('note');
    await Note.create({
      userID: user.id,
      modID: interaction.user.id,
      note,
      guildID: interaction.guild.id,
      timestamp: new Date()
    });
    await interaction.reply({ content: `Note added for <@${user.id}>.`, ephemeral: true });
  }
};
