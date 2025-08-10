const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Punishment = require('../../schemas/Punishment');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('modstats')
    .setDescription('Show most active moderators')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const stats = await Punishment.aggregate([
      { $match: { guildID: interaction.guild.id } },
      { $group: { _id: '$modID', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    if (!stats.length) return interaction.reply({ content: 'No moderation actions found.', ephemeral: true });
    const lines = stats.map((s, i) => `${i+1}. <@${s._id}> — ${s.count} actions`);
    await interaction.reply({ content: `Top Moderators:\n${lines.join('\n')}`, ephemeral: true });
  }
};
