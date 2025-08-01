const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Strike = require('../../schemas/Strike');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('strike')
    .setDescription('Add, remove, or view strikes for a user')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a strike to a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to strike').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for strike').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a strike from a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to remove strike from').setRequired(true))
        .addIntegerOption(opt => opt.setName('strikeid').setDescription('Strike ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View strikes for a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to view').setRequired(true))
    ),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user');
    if (sub === 'add') {
      const reason = interaction.options.getString('reason');
      const strike = await Strike.create({
        userID: user.id,
        modID: interaction.user.id,
        guildID: interaction.guild.id,
        reason
      });
      await interaction.reply({ content: `Strike added to <@${user.id}> (ID: ${strike._id}).`, ephemeral: true });
    } else if (sub === 'remove') {
      const strikeId = interaction.options.getInteger('strikeid');
      const strike = await Strike.findOneAndUpdate({ _id: strikeId, userID: user.id, guildID: interaction.guild.id }, { removed: true });
      if (strike) {
        await interaction.reply({ content: `Strike ${strikeId} removed from <@${user.id}>.`, ephemeral: true });
      } else {
        await interaction.reply({ content: `Strike not found.`, ephemeral: true });
      }
    } else if (sub === 'view') {
      const strikes = await Strike.find({ userID: user.id, guildID: interaction.guild.id, removed: false });
      if (!strikes.length) return interaction.reply({ content: 'No strikes found for this user.', ephemeral: true });
      const lines = strikes.map(s => `ID: ${s._id} | Reason: ${s.reason} | Date: ${s.timestamp.toLocaleString()}`);
      await interaction.reply({ content: `Strikes for <@${user.id}>:\n${lines.join('\n')}`, ephemeral: true });
    }
  }
};
